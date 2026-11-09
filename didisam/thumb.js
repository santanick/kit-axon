/* v36 thumb — 과정 썸네일 AI 디자인 생성기 · 썸네일 고르기 화면(window.THUMB) · 요원 C
   서버 이미지 모델이 없으므로 브라우저 캔버스에서 '디자인된' 16:9 썸네일을 만든다(정직한 동작: 그림을 지어내지 않고, 자체 제작 아이콘 · 저장소 CC0 사진(hpstock.js) · 배색 · 과정명 글자를 조합).
   - 과정명(+ 대상 · 카테고리) 키워드 → 분야 32개(IT · 외국어 · 수학 · 경영 · 안전 · 요양 · 예술 …) → 어울리는 아이콘 · 사진 · 배색 → 템플릿 16개(사진 4 · 일러스트 3 · 타이포 3 · 그라데이션 2 · 패턴 4).
   - 규칙으로 분야를 못 찾고 Claude가 연결돼 있으면(CL.on) 분야만 Claude에게 한 단어로 묻는다(이미지는 브라우저가 그린다).
   - 결과: 1280×720 이하 webp(안 되면 jpeg) data URL, 약 70KB(문자 수) 이하로 품질 · 크기를 줄인다 — 브라우저 저장(localStorage) · 학습자 게시본 용량 보호.
   공개 API
     THUMB.gen(course|draft, {seed, k, field}) → Promise<{url, w, h, kb, spec, field, fieldName, tpl, tplName}>   (k: AI 추천 0~2번째)
     THUMB.pick(el, d, onPick)   → 고르기 창을 연다. 고르면 d.thumb = url · d.thumbSpec = spec, onPick(url, meta) 호출, el에는 'thumb:pick' 이벤트도 보낸다.
     THUMB.list()                → 템플릿 목록 [{id, name, fam, famName}]
     THUMB.fields() · THUMB.detect(text) · THUMB.render(spec, text, w, h) → canvas
   연결: 과정 상세 설정(cls2) 썸네일 카드 [썸네일 고르기] = ACT['thumb-pick'] · 과정 만들기 흐름(crs-flow)은 B가 THUMB.pick 호출 자리를 둔다. 썸네일 없이 만든 과정은 CF 'create' 때 AI 추천 1번을 자동으로 넣는다. */
(function () {
  'use strict';
  const W = window;
  const BW = 1280, BH = 720, LIM = 70000; /* data URL 문자 수 상한(약 51KB) */
  const BASE = (() => { try { const s = document.currentScript && document.currentScript.src; if (s) return s.replace(/[?#].*$/, '').replace(/[^/]*$/, ''); } catch (e) { } return ''; })();
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = (m, k) => { try { if (typeof toast === 'function') toast(m, k || 'ok'); } catch (e) { } };
  const hash = s => { let h = 2166136261; for (const ch of String(s || '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => { let x = (seed >>> 0) || 0x9e3779b9; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
  const org = () => { try { return (typeof S !== 'undefined' && S && S.org) || {}; } catch (e) { return {}; } };

  /* ───────── 아이콘(자체 제작, 24 격자 선 아이콘 · Path2D) ───────── */
  const IC = {
    chip: 'M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM9.5 9.5h5v5h-5z',
    code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
    chart: 'M3 3v18h18M7 16v-4M11 16V9M15 16v-6M19 16V6',
    globe: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z',
    talk: 'M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-5 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 9h8M8 12h5',
    math: 'M4 7h6M7 4v6M14 7h6M4 17h6M14 15h6M14 19h6M5 15l4 4M9 15l-4 4',
    flask: 'M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3M7 15h10',
    book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7M8 11h5',
    brief: 'M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM8 8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3M3 13h18M11 13v2h2v-2',
    mega: 'M3 10v4a1 1 0 0 0 1 1h3l7 4V5L7 9H4a1 1 0 0 0-1 1zM18 8a5 5 0 0 1 0 8M7 15l1 5h3',
    coin: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM8 8l2 8 2-6 2 6 2-8M7 11h10',
    helmet: 'M3 18h18M5 18v-3a7 7 0 0 1 14 0v3M10 8V5h4v3M8.5 9.5L10 14M15.5 9.5L14 14',
    scale: 'M12 3v18M7 21h10M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z',
    shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4',
    lock: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3M12 15v2',
    heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10zM12 9v5M9.5 11.5h5',
    cross: 'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z',
    palette: 'M12 3a9 9 0 0 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 21 9.8C21 6 17 3 12 3zM7.5 11a1 1 0 1 0 0 .1zM10 7a1 1 0 1 0 0 .1zM15 7a1 1 0 1 0 0 .1z',
    pen: 'M3 21l3-9 9-9 6 6-9 9zM14 4l6 6M6 12l6 6M3 21l6-6',
    note: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0a3 3 0 0 1 6 0zM9 9l12-2',
    chef: 'M6 14a4 4 0 0 1-.5-8A5 5 0 0 1 12 3a5 5 0 0 1 6.5 3A4 4 0 0 1 18 14v6H6zM6 17h12',
    cup: 'M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 2v3M12 2v3',
    bell: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
    leaf: 'M5 21c0-9 6-15 15-16-1 9-7 15-15 16zM5 21l8-8',
    people: 'M9 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
    target: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10zM12 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2z',
    award: 'M12 2a6 6 0 1 0 0 12a6 6 0 1 0 0-12zM8.5 13L7 22l5-3 5 3-1.5-9M10 8l1.5 1.5L14.5 6.5',
    board: 'M3 4h18v12H3zM8 20l4-4 4 4M7 8h6M7 11h9',
    wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
    car: 'M5 17h14M3 13l2-6h14l2 6v5h-3v-2H6v2H3zM7 13.5h.5M16.5 13.5h.5',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    phone: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2M9 5h6',
    cam: 'M3 7h12v10H3zM15 10l6-3v10l-6-3',
    rocket: 'M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 15l-3-3c1-4 4.5-8 12-9-1 7.5-5 11-9 12zM15 8a1 1 0 1 0 0 .1z',
    chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12zM12 15s-3.5-2-3.5-4.2a1.8 1.8 0 0 1 3.5-.6 1.8 1.8 0 0 1 3.5.6C15.5 13 12 15 12 15z',
    sciss: 'M6 9a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM8.1 7.9L20 20M8.1 16.1L20 4',
    grad: 'M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6',
    clip: 'M8 3h8v3H8zM6 4.5H5v17h14v-17h-1M8 11h8M8 15h5',
    bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
    drone: 'M5 5a2 2 0 1 0 0 .1zM19 5a2 2 0 1 0 0 .1zM5 19a2 2 0 1 0 0 .1zM19 19a2 2 0 1 0 0 .1zM6.5 6.5l3 3M17.5 6.5l-3 3M6.5 17.5l3-3M17.5 17.5l-3-3M9.5 9.5h5v5h-5z'
  };
  const P2D = {}; const path = k => P2D[k] || (P2D[k] = new Path2D(IC[k] || IC.grad));

  /* ───────── 분야 32개: 키워드 · 아이콘 · 색상(hue) · 사진(hpstock id) ───────── */
  const FIELDS = [
    { k: 'ai', n: 'IT · 인공지능', en: 'AI', re: /(AI|인공지능|챗\s?GPT|GPT|생성형|머신\s?러닝|딥\s?러닝|프롬프트|LLM|에이아이)/i, ic: 'chip', x: ['bulb', 'code', 'chart'], h: 232, h2: 280, ph: ['rob-01', 'hum-41', 'cod-04', 'lap-08', 'hum-42'] },
    { k: 'code', n: '코딩 · 개발', en: 'CODE', re: /(코딩|프로그래밍|개발자|개발 입문|파이썬|Python|자바|Java|웹 ?개발|앱 ?개발|HTML|CSS|C언어|알고리즘|소프트웨어|SW|프론트엔드|백엔드|풀스택|부트캠프)/i, ic: 'code', x: ['chip', 'bulb', 'board'], h: 205, h2: 160, ph: ['cod-01', 'cod-02', 'cod-03', 'hum-07', 'hum-42'] },
    { k: 'data', n: '데이터 · 오피스', en: 'DATA', re: /(데이터|엑셀|Excel|파워포인트|PPT|오피스|컴활|컴퓨터 ?활용|노션|Notion|스프레드시트|통계|SQL|업무 ?자동화|ITQ|한글 ?문서|보고서 작성|태블로|파워 ?BI)/i, ic: 'chart', x: ['clip', 'chip', 'target'], h: 150, h2: 205, ph: ['dat-01', 'lap-03', 'off-13', 'cor-06', 'lap-08'] },
    { k: 'lang', n: '외국어', en: 'LANGUAGE', re: /(영어|English|토익|TOEIC|토플|TOEFL|오픽|OPIc|아이엘츠|IELTS|일본어|JLPT|중국어|HSK|스페인어|프랑스어|독일어|베트남어|러시아어|외국어|어학|회화|한국어|글로벌|비즈니스 영어)/i, ic: 'globe', x: ['talk', 'book', 'star'], h: 12, h2: 45, ph: ['lan-01', 'lan-02', 'kid-09', 'lib-05', 'hum-38'] },
    { k: 'math', n: '수학', en: 'MATH', re: /(수학|미적분|기하|확률|대수|산수|연산|수리|함수|방정식|수와 연산)/, ic: 'math', x: ['chart', 'target', 'bulb'], h: 258, h2: 210, ph: ['brd-01', 'hum-39', 'dsk-07', 'dsk-09'] },
    { k: 'sci', n: '과학 · 탐구', en: 'SCIENCE', re: /(과학|물리|화학|생물|지구과학|실험|STEAM|STEM|탐구|바이오|우주|천문)/i, ic: 'flask', x: ['bulb', 'globe', 'leaf'], h: 175, h2: 120, ph: ['sci-01', 'sci-02', 'hum-33'] },
    { k: 'human', n: '국어 · 인문', en: 'HUMANITIES', re: /(국어|문학|독서|논술|글쓰기|작문|인문|역사|철학|한자|고전|에세이|책 쓰기|스토리텔링)/, ic: 'book', x: ['pen', 'talk', 'bulb'], h: 28, h2: 350, ph: ['lib-03', 'lib-06', 'lib-07', 'hum-38', 'hum-43'] },
    { k: 'biz', n: '경영 · 리더십', en: 'LEADERSHIP', re: /(경영|리더십|리더|조직|관리자|팀장|중간관리|전략|기획|HR|인사|온보딩|신입사원|신규 ?입사|직무|비즈니스|커뮤니케이션|협업|보고|성과|코칭 리더)/i, ic: 'brief', x: ['people', 'target', 'chart'], h: 220, h2: 195, ph: ['off-01', 'cor-01', 'grp-01', 'grp-06', 'off-02'] },
    { k: 'mkt', n: '마케팅 · 영업', en: 'MARKETING', re: /(마케팅|브랜딩|브랜드|SNS|광고|퍼포먼스|세일즈|영업|CS|고객 ?응대|고객 ?서비스|서비스 ?교육|쇼핑몰|커머스|스마트스토어|라이브 ?커머스)/i, ic: 'mega', x: ['target', 'chart', 'talk'], h: 340, h2: 20, ph: ['hum-49', 'grp-05', 'shk-01', 'grp-03'] },
    { k: 'fin', n: '회계 · 금융', en: 'FINANCE', re: /(회계|재무|세무|금융|경제|투자|주식|부동산|재테크|전산회계|원가|연말정산|자산|보험)/, ic: 'coin', x: ['chart', 'brief', 'lock'], h: 160, h2: 45, ph: ['doc-01', 'off-11', 'dat-01', 'off-08'] },
    { k: 'safe', n: '안전 · 보건', en: 'SAFETY', re: /(안전|산업안전|산안|중대재해|소방|화재|재난|응급|심폐|CPR|위험성 ?평가|보건 ?관리|산업보건|MSDS|밀폐공간)/i, ic: 'helmet', x: ['shield', 'cross', 'bell'], h: 32, h2: 48, ph: ['voc-01', 'wrk-07', 'wrk-01', 'hum-19', 'wrk-05'] },
    { k: 'law', n: '법정 의무교육', en: 'COMPLIANCE', re: /(법정|의무 ?교육|성희롱|성폭력|괴롭힘|장애인 ?인식|인권|윤리|청렴|부패|갑질|폭력 ?예방|아동학대|가정폭력|성매매|직장 ?내)/, ic: 'scale', x: ['shield', 'people', 'clip'], h: 222, h2: 250, ph: ['civ-01', 'civ-04', 'hum-46', 'doc-01', 'off-07'] },
    { k: 'sec', n: '개인정보 · 보안', en: 'SECURITY', re: /(개인정보|정보 ?보호|보안|해킹|사이버|정보보안|랜섬|피싱|클라우드 ?보안)/, ic: 'shield', x: ['lock', 'chip', 'code'], h: 190, h2: 235, ph: ['cod-04', 'hum-41', 'lap-08'] },
    { k: 'care', n: '요양 · 돌봄', en: 'CARE', re: /(요양|돌봄|간병|사회복지|복지|노인|치매|장기요양|보육|육아|요양보호사|활동지원)/, ic: 'heart', x: ['people', 'cross', 'leaf'], h: 350, h2: 25, ph: ['fam-05', 'sen-01', 'sen-04', 'hum-34', 'sen-06'] },
    { k: 'med', n: '보건 · 의료', en: 'HEALTH', re: /(의료|간호|병원|의학|약학|건강|헬스케어|응급구조|임상|감염|위생|보건의료)/, ic: 'cross', x: ['heart', 'flask', 'shield'], h: 185, h2: 150, ph: ['sci-01', 'hum-33', 'sci-02'] },
    { k: 'art', n: '미술 · 공예', en: 'ART', re: /(미술|그림|드로잉|수채화|유화|캘리|일러스트|공예|도예|뜨개|목공|도자기|민화|서예|아트)/, ic: 'palette', x: ['pen', 'star', 'heart'], h: 330, h2: 40, ph: ['art-01', 'art-02', 'art-06', 'hum-26', 'hum-27', 'hum-22', 'kni-02'] },
    { k: 'design', n: '디자인', en: 'DESIGN', re: /(디자인|UX|UI|포토샵|일러스트레이터|피그마|Figma|편집 ?디자인|캔바|Canva|3D|모델링|블렌더)/i, ic: 'pen', x: ['palette', 'board', 'bulb'], h: 265, h2: 320, ph: ['dsn-01', 'dsk-04', 'hum-40', 'lap-10'] },
    { k: 'music', n: '음악', en: 'MUSIC', re: /(음악|피아노|기타|보컬|노래|작곡|악기|드럼|바이올린|밴드|실용음악|합창|우쿨렐레|오케스트라)/, ic: 'note', x: ['star', 'heart', 'talk'], h: 275, h2: 330, ph: ['mus-01', 'mus-02', 'mus-05', 'hum-29', 'hum-30', 'mus-07'] },
    { k: 'cook', n: '요리 · 제과제빵', en: 'COOKING', re: /(요리|조리|한식|양식|일식|중식|제과|제빵|베이킹|바리스타|커피|음료|식품|푸드|디저트|조주)/, ic: 'chef', x: ['cup', 'heart', 'star'], h: 22, h2: 40, ph: ['bak-01', 'bak-03', 'bar-01', 'coo-01', 'bak-05', 'bar-02'] },
    { k: 'sport', n: '체육 · 건강', en: 'FITNESS', re: /(체육|운동|요가|필라테스|헬스|피트니스|축구|농구|수영|태권도|댄스|스포츠|생활체육|스트레칭|러닝)/, ic: 'bell', x: ['heart', 'target', 'star'], h: 140, h2: 95, ph: ['spo-02', 'spo-03', 'yog-01', 'yog-03', 'spo-05'] },
    { k: 'career', n: '취업 · 진로', en: 'CAREER', re: /(취업|면접|자소서|자기소개서|이력서|진로|커리어|채용|직업 ?탐색|이직|구직|포트폴리오)/, ic: 'target', x: ['brief', 'talk', 'star'], h: 200, h2: 30, ph: ['hum-51', 'shk-01', 'doc-01', 'cam-08'] },
    { k: 'cert', n: '자격 · 시험 대비', en: 'CERTIFICATE', re: /(자격증|기능사|산업기사|기사 ?(필기|실기)|필기|실기|합격|시험 ?대비|모의고사|수능|내신|공무원|검정고시|국가고시|공인|기출)/, ic: 'award', x: ['clip', 'target', 'book'], h: 45, h2: 220, ph: ['hum-02', 'hum-39', 'dsk-03', 'dsk-08'] },
    { k: 'teach', n: '교수법 · 교원', en: 'TEACHING', re: /(교수법|교원|교사|강사 ?양성|수업 ?설계|에듀테크|이러닝|원격 ?수업|티칭|교육학|교수 ?역량|FD)/, ic: 'board', x: ['grad', 'people', 'bulb'], h: 210, h2: 160, ph: ['lec-01', 'cls-02', 'cls-01', 'lec-03'] },
    { k: 'tech', n: '기술 · 정비', en: 'TECHNICAL', re: /(정비|용접|전기|기계|설비|CNC|PLC|제조|자동차|건설|배관|냉동|공조|스마트 ?팩토리|물류|지게차|전자|반도체|기능 ?훈련|목수|타일|도배)/, ic: 'wrench', x: ['helmet', 'car', 'chip'], h: 25, h2: 210, ph: ['aut-01', 'aut-03', 'voc-01', 'wrk-07', 'wrk-04', 'hum-18', 'log-02'] },
    { k: 'drone', n: '드론 · 모빌리티', en: 'MOBILITY', re: /(드론|모빌리티|무인기|전기차|자율주행|운전)/, ic: 'drone', x: ['car', 'chip', 'target'], h: 195, h2: 25, ph: ['dro-01', 'dro-02', 'aut-03'] },
    { k: 'kids', n: '어린이', en: 'KIDS', re: /(유아|어린이|초등|키즈|놀이|아동|창의|블록|레고|동화|그림책)/, ic: 'star', x: ['palette', 'note', 'heart'], h: 45, h2: 195, ph: ['kid-01', 'kid-03', 'kid-04', 'kid-06', 'hum-35'] },
    { k: 'senior', n: '시니어 · 디지털', en: 'SENIOR', re: /(시니어|어르신|노년|실버|디지털 ?문해|스마트폰|키오스크|은퇴|인생 ?2막|신중년|장노년|5060|액티브 ?에이징)/, ic: 'phone', x: ['heart', 'people', 'leaf'], h: 20, h2: 160, ph: ['sen-01', 'sen-03', 'sen-07', 'hum-34', 'sen-06'] },
    { k: 'eco', n: '환경 · 원예', en: 'GREEN', re: /(환경|원예|정원|가드닝|생태|탄소|ESG|기후|도시농업|반려식물|숲|업사이클)/i, ic: 'leaf', x: ['globe', 'heart', 'star'], h: 125, h2: 80, ph: ['nat-01', 'nat-02', 'nat-03', 'gar-01'] },
    { k: 'media', n: '영상 · 콘텐츠', en: 'CREATOR', re: /(영상|유튜브|YouTube|사진|촬영|편집|프리미어|크리에이터|방송|숏폼|릴스|브이로그|카메라|팟캐스트)/i, ic: 'cam', x: ['note', 'star', 'mega'], h: 0, h2: 280, ph: ['vid-01', 'pho-01', 'pho-02', 'hum-31'] },
    { k: 'startup', n: '창업 · 비즈니스', en: 'STARTUP', re: /(창업|스타트업|사업계획|IR|투자 ?유치|소상공인|자영업|1인 ?기업|비즈니스 ?모델|사업화|예비 ?창업)/, ic: 'rocket', x: ['bulb', 'chart', 'target'], h: 255, h2: 15, ph: ['grp-02', 'grp-06', 'off-02', 'off-03'] },
    { k: 'mind', n: '상담 · 심리', en: 'MIND', re: /(상담|심리|마음|스트레스|힐링|명상|정서|코칭|감정|웰니스|번아웃|회복탄력성)/, ic: 'chat', x: ['heart', 'leaf', 'people'], h: 165, h2: 300, ph: ['nat-01', 'yog-03', 'hum-04', 'hum-36'] },
    { k: 'beauty', n: '뷰티 · 미용', en: 'BEAUTY', re: /(미용|메이크업|네일|헤어|피부|뷰티|이용사|속눈썹|두피)/, ic: 'sciss', x: ['star', 'heart', 'palette'], h: 335, h2: 20, ph: ['bea-01', 'bea-02'] },
    { k: 'gen', n: '교육과정', en: 'COURSE', re: /$^/, ic: 'grad', x: ['book', 'bulb', 'star'], h: 230, h2: 150, ph: ['lap-01', 'dsk-03', 'lib-01', 'hum-36', 'cls-01'] }
  ];
  const FBY = Object.fromEntries(FIELDS.map(f => [f.k, f]));
  function detect(text) {
    const s = String(text || ''); let best = null, bs = 0;
    FIELDS.forEach((f, i) => { if (f.k === 'gen') return; const m = s.match(new RegExp(f.re.source, f.re.flags.includes('g') ? f.re.flags : f.re.flags + 'g')); const n = m ? m.length : 0; const sc = n * 10 - i * 0.01; if (n && sc > bs) { bs = sc; best = f; } });
    return best || FBY.gen;
  }

  /* ───────── 배색: 분야 색(hue)에서 5가지 계열 ───────── */
  const hsl = (c, a) => `hsl(${((c[0] % 360) + 360) % 360} ${c[1]}% ${c[2]}%${a == null ? '' : ` / ${a}`})`;
  const SCH = [
    (h, h2) => ({ id: 'deep', dark: true, a: [h, 62, 20], b: [h2, 68, 42], c: [h + 165, 90, 66], l: [h, 60, 95], ink: [0, 0, 100] }),
    (h, h2) => ({ id: 'vivid', dark: true, a: [h, 74, 44], b: [h2, 80, 56], c: [h + 40, 95, 82], l: [h, 70, 95], ink: [0, 0, 100] }),
    (h, h2) => ({ id: 'night', dark: true, a: [h, 34, 11], b: [h, 40, 21], c: [h2, 88, 62], l: [h, 40, 92], ink: [0, 0, 100] }),
    (h, h2) => ({ id: 'soft', dark: false, a: [h, 62, 93], b: [h2, 58, 84], c: [h, 72, 46], l: [0, 0, 100], ink: [h, 55, 15] }),
    (h, h2) => ({ id: 'paper', dark: false, a: [45, 33, 97], b: [h, 52, 88], c: [h, 74, 44], l: [0, 0, 100], ink: [230, 12, 13] })
  ];
  const palOf = (f, i) => SCH[((i % SCH.length) + SCH.length) % SCH.length](f.h, f.h2);
  const DARK = [0, 1, 2], LIGHT = [3, 4];

  /* ───────── 글꼴 · 사진 불러오기 ───────── */
  const FT = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  const DISP = '"TH Black Han Sans", ' + FT;
  let fontP = null;
  function fonts() {
    if (fontP) return fontP;
    const tasks = [];
    try { if (W.FontFace && document.fonts) { const ff = new FontFace('TH Black Han Sans', `url(${BASE}fonts/BlackHanSans-400.woff2)`); tasks.push(ff.load().then(x => document.fonts.add(x)).catch(() => { })); } } catch (e) { }
    try { if (document.fonts && document.fonts.load) tasks.push(document.fonts.load(`800 40px ${FT}`).catch(() => { })); } catch (e) { }
    fontP = Promise.race([Promise.all(tasks), new Promise(ok => setTimeout(ok, 1800))]);
    return fontP;
  }
  const IMGS = {};
  function photo(id) {
    if (!id) return Promise.resolve(null); if (IMGS[id]) return IMGS[id];
    const it = W.HPSTOCK && HPSTOCK.get && HPSTOCK.get(id); if (!it) return Promise.resolve(null);
    const src = BASE + (it.src800 || it.src);
    IMGS[id] = new Promise(ok => { const im = new Image(); im.decoding = 'async'; im.onload = () => ok({ img: im, focus: it.focus || '50% 50%', tone: it.tone }); im.onerror = () => ok(null); im.src = src; });
    return IMGS[id];
  }
  const photosOf = f => (f.ph || []).filter(id => W.HPSTOCK && HPSTOCK.get && HPSTOCK.get(id)).concat(f.k === 'gen' ? [] : FBY.gen.ph.filter(id => W.HPSTOCK && HPSTOCK.get && HPSTOCK.get(id)));

  /* ───────── 그리기 도구(좌표는 1280×720 기준) ───────── */
  function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); } }
  function cover(g, P, x, y, w, h) {
    if (!P || !P.img) return; const im = P.img; const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height; if (!iw || !ih) return;
    const s = Math.max(w / iw, h / ih); const dw = iw * s, dh = ih * s; const [fx, fy] = String(P.focus || '50% 50%').split(/\s+/).map(v => (parseFloat(v) || 50) / 100);
    const dx = x + (w - dw) * fx, dy = y + (h - dh) * fy; g.drawImage(im, dx, dy, dw, dh);
  }
  function icon(g, k, x, y, size, color, lw) { g.save(); g.translate(x, y); const s = size / 24; g.scale(s, s); g.lineWidth = (lw || 1.7); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = color; g.stroke(path(k)); g.restore(); }
  function wrap(g, text, maxW) {
    const words = String(text).trim().split(/\s+/).filter(Boolean); const lines = []; let cur = '';
    const pushLong = w => { let part = ''; for (const ch of w) { if (g.measureText(part + ch).width > maxW && part) { lines.push(part); part = ch; } else part += ch; } return part; };
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width <= maxW) cur = t; else { if (cur) lines.push(cur); cur = g.measureText(w).width > maxW ? pushLong(w) : w; } });
    if (cur) lines.push(cur); return lines;
  }
  /* 글자 크기 맞추기: maxLines 안에 들어가는 가장 큰 크기 */
  function fit(g, text, maxW, maxLines, big, small, weight, fam) {
    let size = big, lines = [];
    for (; size >= small; size -= 2) { g.font = `${weight} ${size}px ${fam}`; lines = wrap(g, text, maxW); if (lines.length <= maxLines) break; }
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); let last = lines[maxLines - 1]; while (last.length > 1 && g.measureText(last + '…').width > maxW) last = last.slice(0, -1); lines[maxLines - 1] = last + '…'; }
    return { lines, size: Math.max(size, small) };
  }
  function lines(g, L, x, y, lh, color, align) { g.fillStyle = color; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic'; L.forEach((t, i) => g.fillText(t, x, y + i * lh)); g.textAlign = 'left'; }
  function chip(g, text, x, y, bg, fg, size, pad) { size = size || 24; pad = pad || 16; g.font = `700 ${size}px ${FT}`; const w = g.measureText(text).width + pad * 2, h = size + pad * 1.1; rr(g, x, y, w, h, h / 2); g.fillStyle = bg; g.fill(); g.fillStyle = fg; g.textBaseline = 'middle'; g.fillText(text, x + pad, y + h / 2 + 1); g.textBaseline = 'alphabetic'; return w; }
  const spaced = (g, text, x, y, sp) => { let cx = x; for (const ch of text) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; } return cx - x; };
  /* 제목 블록: 위에서부터(top) 또는 아래 기준(bottom) */
  function title(g, o, box) {
    const T = fit(g, o.title, box.w, box.lines || 3, box.big || 78, box.small || 40, box.weight || 800, box.fam || FT); const lh = Math.round(T.size * (box.lh || 1.22));
    const H = lh * (T.lines.length - 1) + T.size; let y = box.y; if (box.anchor === 'bottom') y = box.y - H + T.size; else if (box.anchor === 'middle') y = box.y - H / 2 + T.size * .82; else y = box.y + T.size * .82;
    g.font = `${box.weight || 800} ${T.size}px ${box.fam || FT}`; if (box.shadow) { g.shadowColor = box.shadow; g.shadowBlur = 24; } lines(g, T.lines, box.x, y, lh, box.color, box.align); g.shadowColor = 'transparent'; g.shadowBlur = 0;
    return { top: y - T.size * .82, bottom: y + lh * (T.lines.length - 1) + T.size * .25, size: T.size };
  }
  function sub(g, o, x, y, color, size, align) { if (!o.sub) return; g.font = `600 ${size || 28}px ${FT}`; g.fillStyle = color; g.textAlign = align || 'left'; const t = wrap(g, o.sub, 900)[0] || ''; g.fillText(t, x, y); g.textAlign = 'left'; }
  function sprinkle(g, r, n, area, colors) { for (let i = 0; i < n; i++) { const x = area[0] + r() * area[2], y = area[1] + r() * area[3], s = 8 + r() * 18, c = colors[i % colors.length], k = i % 4; g.save(); g.translate(x, y); g.rotate(r() * Math.PI); g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 5; g.lineCap = 'round';
    if (k === 0) { g.beginPath(); g.arc(0, 0, s / 2, 0, 7); g.fill(); } else if (k === 1) { g.beginPath(); g.moveTo(-s / 2, 0); g.lineTo(s / 2, 0); g.moveTo(0, -s / 2); g.lineTo(0, s / 2); g.stroke(); } else if (k === 2) { rr(g, -s / 2, -s / 2, s, s, 4); g.fill(); } else { g.beginPath(); g.arc(0, 0, s / 2, 0, 7); g.stroke(); } g.restore(); } }
  const grad = (g, x0, y0, x1, y1, stops) => { const q = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
  const eyebrow = o => o.eye;

  /* ───────── 템플릿 16개 ─────────
     fam: photo(사진) · illust(일러스트) · type(타이포) · grad(그라데이션) · pattern(패턴) / tone: 쓰는 배색(dark · light) */
  const M = 104; /* 좌우 여백(16:10 카드로 잘려도 글자가 남게) */
  const TPL = [
    { id: 'photo', name: '사진 · 아래 그늘', fam: 'photo', tone: 'dark', draw(g, o) { const p = o.p;
      g.fillStyle = hsl(p.a); g.fillRect(0, 0, BW, BH); cover(g, o.img, 0, 0, BW, BH);
      g.fillStyle = grad(g, 0, 140, 0, BH, [[0, hsl(p.a, 0)], [.45, hsl(p.a, .45)], [1, hsl(p.a, .94)]]); g.fillRect(0, 0, BW, BH);
      chip(g, o.eye, M, 64, 'rgba(255,255,255,.94)', hsl([p.a[0], 60, 20]), 30);
      g.fillStyle = hsl(p.c); g.fillRect(M, 392, 72, 8);
      const t = title(g, o, { x: M, y: o.sub ? 610 : 646, w: BW - M * 2 - 40, lines: 2, big: 84, small: 46, color: '#fff', anchor: 'bottom' });
      sub(g, o, M, Math.min(668, t.bottom + 50), 'rgba(255,255,255,.86)', 32); } },
    { id: 'split', name: '사진 · 반반', fam: 'photo', tone: 'dark', draw(g, o) { const p = o.p;
      g.fillStyle = hsl(p.a); g.fillRect(0, 0, BW, BH); g.save(); g.beginPath(); g.moveTo(600, 0); g.lineTo(BW, 0); g.lineTo(BW, BH); g.lineTo(500, BH); g.closePath(); g.clip(); cover(g, o.img, 500, 0, BW - 500, BH); g.restore();
      g.fillStyle = hsl(p.c); g.beginPath(); g.moveTo(600, 0); g.lineTo(624, 0); g.lineTo(524, BH); g.lineTo(500, BH); g.closePath(); g.fill();
      rr(g, M, 84, 76, 76, 20); g.fillStyle = hsl(p.c); g.fill(); icon(g, o.f.ic, M + 16, 100, 44, hsl(p.a), 2);
      g.font = `800 26px ${FT}`; g.fillStyle = hsl(p.c); spaced(g, o.f.en, M, 214, 3);
      const t = title(g, o, { x: M, y: 246, w: 400, lines: 4, big: 64, small: 36, color: '#fff' });
      if (o.sub) { g.font = `600 24px ${FT}`; g.fillStyle = 'rgba(255,255,255,.8)'; lines(g, wrap(g, o.sub, 380).slice(0, 2), M, Math.min(640, t.bottom + 46), 34, 'rgba(255,255,255,.8)'); } } },
    { id: 'frame', name: '사진 · 액자', fam: 'photo', tone: 'light', draw(g, o) { const p = o.p, r = o.r;
      g.fillStyle = hsl(p.a); g.fillRect(0, 0, BW, BH);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(M + 6 + i * 26, 600 + j * 26, 4, 0, 7); g.fillStyle = hsl(p.c, .35); g.fill(); }
      g.save(); g.translate(930, 360); g.rotate(-.05); rr(g, -270, -250, 540, 500, 36); g.fillStyle = hsl(p.b); g.fill(); g.restore();
      g.save(); g.shadowColor = 'rgba(20,20,40,.22)'; g.shadowBlur = 40; g.shadowOffsetY = 18; rr(g, 676, 110, 500, 500, 32); g.fillStyle = '#fff'; g.fill(); g.restore();
      g.save(); rr(g, 690, 124, 472, 472, 24); g.clip(); cover(g, o.img, 690, 124, 472, 472); g.restore();
      rr(g, 1080, 520, 120, 120, 30); g.fillStyle = hsl(p.c); g.fill(); icon(g, o.f.ic, 1110, 550, 60, '#fff', 2);
      chip(g, o.eye, M, 96, hsl(p.c), '#fff', 30);
      const t = title(g, o, { x: M, y: 190, w: 520, lines: 3, big: 70, small: 40, color: hsl(p.ink) });
      sub(g, o, M, Math.min(560, t.bottom + 56), hsl(p.ink, .66), 30); void r; } },
    { id: 'duo', name: '사진 · 듀오톤', fam: 'photo', tone: 'dark', draw(g, o) { const p = o.p;
      g.fillStyle = hsl(p.a); g.fillRect(0, 0, BW, BH); cover(g, o.img, 0, 0, BW, BH);
      g.globalCompositeOperation = 'color'; g.fillStyle = hsl(p.b); g.fillRect(0, 0, BW, BH);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = grad(g, 0, 0, BW, BH, [[0, hsl(p.a)], [1, hsl(p.b, .55)]]); g.fillRect(0, 0, BW, BH);
      g.globalCompositeOperation = 'source-over'; g.fillStyle = hsl(p.a, .35); g.fillRect(0, 0, BW, BH);
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; rr(g, 40, 40, BW - 80, BH - 80, 18); g.stroke();
      g.font = `800 24px ${FT}`; g.fillStyle = hsl(p.c); spaced(g, o.f.en + '  ·  ' + o.f.n, M, 132, 2);
      const t = title(g, o, { x: M, y: 172, w: 880, lines: 3, big: 88, small: 46, color: '#fff' });
      sub(g, o, M, Math.min(640, t.bottom + 58), 'rgba(255,255,255,.85)', 32); } },
    { id: 'hero', name: '일러스트 · 큰 아이콘', fam: 'illust', tone: 'dark', draw(g, o) { const p = o.p, r = o.r;
      g.fillStyle = grad(g, 0, 0, BW, BH, [[0, hsl(p.a)], [1, hsl(p.b)]]); g.fillRect(0, 0, BW, BH);
      const cx = 960, cy = 372; [300, 240].forEach((R, i) => { g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fillStyle = `rgba(255,255,255,${i ? .1 : .06})`; g.fill(); });
      g.setLineDash([6, 14]); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 340, 0, 7); g.stroke(); g.setLineDash([]);
      g.save(); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 40; g.shadowOffsetY = 16; g.beginPath(); g.arc(cx, cy, 170, 0, 7); g.fillStyle = hsl(p.c); g.fill(); g.restore();
      icon(g, o.f.ic, cx - 100, cy - 100, 200, hsl(p.a), 1.6);
      o.f.x.slice(0, 3).forEach((k, i) => { const a = -2.2 + i * 1.5, x = cx + Math.cos(a) * 300, y = cy + Math.sin(a) * 300; g.beginPath(); g.arc(x, y, 46, 0, 7); g.fillStyle = '#fff'; g.fill(); icon(g, k, x - 24, y - 24, 48, hsl(p.a), 2); });
      sprinkle(g, r, 9, [620, 20, 640, 680], ['rgba(255,255,255,.55)', hsl(p.c, .8)]);
      chip(g, o.eye, M, 92, 'rgba(255,255,255,.16)', '#fff', 30);
      const t = title(g, o, { x: M, y: 186, w: 520, lines: 4, big: 72, small: 40, color: '#fff' });
      sub(g, o, M, Math.min(650, t.bottom + 56), 'rgba(255,255,255,.8)', 30); } },
    { id: 'center', name: '일러스트 · 가운데', fam: 'illust', tone: 'light', draw(g, o) { const p = o.p, r = o.r;
      g.fillStyle = hsl(p.a); g.fillRect(0, 0, BW, BH);
      g.beginPath(); g.arc(80, 60, 220, 0, 7); g.fillStyle = hsl(p.b, .7); g.fill(); g.beginPath(); g.arc(1220, 700, 260, 0, 7); g.fillStyle = hsl(p.b, .55); g.fill();
      sprinkle(g, r, 12, [140, 40, 1000, 640], [hsl(p.c, .5), hsl(p.b), hsl(p.c, .25)]);
      g.save(); g.shadowColor = hsl(p.c, .35); g.shadowBlur = 36; g.shadowOffsetY = 14; rr(g, 560, 92, 160, 160, 44); g.fillStyle = hsl(p.c); g.fill(); g.restore();
      icon(g, o.f.ic, 585, 117, 110, '#fff', 1.8);
      g.font = `800 24px ${FT}`; g.fillStyle = hsl(p.c); g.textAlign = 'center'; g.fillText(o.eye, 640, 318); g.textAlign = 'left';
      const t = title(g, o, { x: 640, y: 350, w: 1000, lines: 2, big: 76, small: 42, color: hsl(p.ink), align: 'center' });
      sub(g, o, 640, Math.min(668, t.bottom + 54), hsl(p.ink, .62), 32, 'center'); } },
    { id: 'sticker', name: '일러스트 · 스티커', fam: 'illust', tone: 'light', draw(g, o) { const p = o.p, r = o.r;
      g.fillStyle = hsl(p.a); g.fillRect(0, 0, BW, BH);
      const K = [o.f.ic, ...o.f.x, o.f.ic, o.f.x[0]]; const pos = [[930, 330, 230, -.08], [720, 150, 130, .12], [1150, 140, 120, -.15], [740, 560, 140, -.1], [1130, 560, 130, .14], [1210, 360, 80, .2]];
      pos.forEach(([x, y, s, rot], i) => { const bg = i === 0 ? hsl(p.c) : i % 2 ? '#fff' : hsl(p.b); g.save(); g.translate(x, y); g.rotate(rot); g.shadowColor = 'rgba(20,20,40,.14)'; g.shadowBlur = 24; g.shadowOffsetY = 10; rr(g, -s / 2, -s / 2, s, s, s * .28); g.fillStyle = bg; g.fill(); g.shadowColor = 'transparent'; icon(g, K[i] || o.f.ic, -s * .32, -s * .32, s * .64, i === 0 ? '#fff' : hsl(p.c), i === 0 ? 1.6 : 2); g.restore(); });
      sprinkle(g, r, 7, [620, 40, 640, 640], [hsl(p.c, .5), hsl(p.b)]);
      chip(g, o.eye, M, 104, '#fff', hsl(p.c), 30);
      const t = title(g, o, { x: M, y: 196, w: 500, lines: 4, big: 70, small: 40, color: hsl(p.ink) });
      sub(g, o, M, Math.min(650, t.bottom + 56), hsl(p.ink, .62), 30); } },
    { id: 'bold', name: '타이포 · 굵게', fam: 'type', tone: 'dark', draw(g, o) { const p = o.p;
      g.fillStyle = hsl(p.b); g.fillRect(0, 0, BW, BH);
      icon(g, o.f.ic, 820, 250, 560, 'rgba(255,255,255,.16)', 1.5);
      g.fillStyle = hsl(p.c); g.fillRect(M, 96, 12, 64); g.font = `800 30px ${FT}`; g.fillStyle = '#fff'; g.fillText(o.eye, M + 30, 138);
      const t = title(g, o, { x: M, y: 214, w: 980, lines: 3, big: 122, small: 56, color: '#fff', fam: DISP, weight: 400, lh: 1.12 });
      sub(g, o, M, Math.min(668, t.bottom + 56), 'rgba(255,255,255,.88)', 32); } },
    { id: 'minimal', name: '타이포 · 미니멀', fam: 'type', tone: 'light', draw(g, o) { const p = o.p;
      g.fillStyle = hsl([45, 33, 97]); g.fillRect(0, 0, BW, BH); g.fillStyle = hsl(p.c); g.fillRect(0, 0, 20, BH);
      g.font = `700 22px ${FT}`; g.fillStyle = hsl(p.c); spaced(g, o.f.en, M, 130, 6);
      icon(g, o.f.ic, BW - M - 64, 92, 64, hsl(p.c), 1.6);
      g.strokeStyle = hsl(p.ink, .16); g.lineWidth = 2; g.beginPath(); g.moveTo(M, 162); g.lineTo(BW - M, 162); g.stroke();
      const t = title(g, o, { x: M, y: 222, w: 960, lines: 3, big: 84, small: 44, color: hsl([230, 12, 13]), weight: 700, lh: 1.2 });
      g.fillStyle = hsl(p.c); g.fillRect(M, Math.min(600, t.bottom + 28), 56, 6);
      sub(g, o, M, Math.min(664, t.bottom + 84), hsl([230, 10, 35]), 32);
      g.font = `600 22px ${FT}`; g.fillStyle = hsl([230, 10, 45]); g.textAlign = 'right'; g.fillText(o.f.n, BW - M, 664); g.textAlign = 'left'; } },
    { id: 'outline', name: '타이포 · 큰 글자', fam: 'type', tone: 'dark', draw(g, o) { const p = o.p;
      g.fillStyle = hsl(p.a); g.fillRect(0, 0, BW, BH);
      g.font = `400 430px ${DISP}`; g.lineWidth = 4; g.strokeStyle = hsl(p.c, .32); g.textBaseline = 'alphabetic'; const word = o.f.en.length > 6 ? o.f.en.slice(0, 5) : o.f.en; g.strokeText(word, 300, 560); g.strokeStyle = 'rgba(255,255,255,.06)'; g.strokeText(word, 330, 590);
      chip(g, o.eye, M, 84, hsl(p.c), hsl(p.a), 30);
      const t = title(g, o, { x: M, y: o.sub ? 600 : 640, w: 1000, lines: 3, big: 92, small: 48, color: '#fff', anchor: 'bottom' });
      sub(g, o, M, Math.min(670, t.bottom + 52), 'rgba(255,255,255,.8)', 32); } },
    { id: 'mesh', name: '그라데이션 · 메시', fam: 'grad', tone: 'dark', draw(g, o) { const p = o.p, r = o.r;
      g.fillStyle = hsl(p.a); g.fillRect(0, 0, BW, BH);
      [[p.b, .9, 640], [p.c, .75, 520], [[p.b[0] + 40, 80, 55], .7, 560], [p.c, .5, 420]].forEach(([c, a, R], i) => { const x = 300 + r() * 900, y = (i % 2 ? 560 : 120) + r() * 160; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, hsl(c, a)); q.addColorStop(1, hsl(c, 0)); g.fillStyle = q; g.fillRect(0, 0, BW, BH); });
      icon(g, o.f.ic, BW - M - 88, 84, 88, 'rgba(255,255,255,.9)', 1.6);
      chip(g, o.eye, M, 88, 'rgba(255,255,255,.18)', '#fff', 30);
      const t = title(g, o, { x: M, y: 210, w: 900, lines: 3, big: 90, small: 46, color: '#fff', shadow: 'rgba(0,0,0,.18)' });
      sub(g, o, M, Math.min(660, t.bottom + 56), 'rgba(255,255,255,.88)', 32); } },
    { id: 'card', name: '그라데이션 · 카드', fam: 'grad', tone: 'dark', draw(g, o) { const p = o.p;
      g.fillStyle = grad(g, 0, BH, BW, 0, [[0, hsl(p.a)], [.6, hsl(p.b)], [1, hsl(p.c, .9)]]); g.fillRect(0, 0, BW, BH);
      g.save(); g.translate(1070, 360); g.rotate(.18); icon(g, o.f.ic, -190, -190, 380, 'rgba(255,255,255,.28)', 1.4); g.restore();
      g.save(); g.shadowColor = 'rgba(10,10,30,.28)'; g.shadowBlur = 50; g.shadowOffsetY = 20; rr(g, M, 120, 760, 480, 28); g.fillStyle = '#fff'; g.fill(); g.restore();
      rr(g, M + 48, 168, 72, 72, 18); g.fillStyle = hsl(p.a); g.fill(); icon(g, o.f.ic, M + 64, 184, 40, '#fff', 2);
      g.font = `800 22px ${FT}`; g.fillStyle = hsl(p.b); g.fillText(o.eye, M + 140, 214);
      const t = title(g, o, { x: M + 48, y: 284, w: 660, lines: 3, big: 64, small: 36, color: hsl([p.a[0], 40, 14]) });
      sub(g, o, M + 48, Math.min(568, t.bottom + 48), hsl([p.a[0], 15, 40]), 28); } },
    { id: 'dots', name: '패턴 · 점', fam: 'pattern', tone: 'light', draw(g, o) { const p = o.p;
      g.fillStyle = hsl(p.a); g.fillRect(0, 0, BW, BH);
      for (let x = 20; x < BW; x += 36) for (let y = 20; y < BH; y += 36) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fillStyle = hsl(p.c, .2); g.fill(); }
      g.beginPath(); g.moveTo(820, 80); g.bezierCurveTo(1120, 20, 1260, 260, 1200, 440); g.bezierCurveTo(1140, 640, 900, 700, 780, 560); g.bezierCurveTo(660, 420, 620, 120, 820, 80); g.fillStyle = hsl(p.c); g.fill();
      icon(g, o.f.ic, 860, 220, 230, '#fff', 1.6);
      rr(g, M - 24, 150, 600, 420, 28); g.fillStyle = 'rgba(255,255,255,.92)'; g.fill();
      chip(g, o.eye, M + 16, 190, hsl(p.c, .12), hsl(p.c), 28);
      const t = title(g, o, { x: M + 16, y: 270, w: 520, lines: 3, big: 62, small: 36, color: hsl(p.ink) });
      sub(g, o, M + 16, Math.min(540, t.bottom + 48), hsl(p.ink, .6), 28); } },
    { id: 'stripe', name: '패턴 · 사선', fam: 'pattern', tone: 'dark', draw(g, o) { const p = o.p;
      g.fillStyle = hsl(p.a); g.fillRect(0, 0, BW, BH);
      g.save(); g.beginPath(); g.rect(640, 0, BW - 640, BH); g.clip(); for (let i = -10; i < 30; i++) { g.save(); g.translate(640 + i * 64, 0); g.transform(1, 0, -0.6, 1, 0, 0); g.fillStyle = i % 3 === 0 ? hsl(p.c, .9) : hsl(p.b, i % 2 ? .55 : .3); g.fillRect(0, 0, 28, BH); g.restore(); } g.restore();
      g.fillStyle = hsl(p.a); g.beginPath(); g.moveTo(0, 0); g.lineTo(760, 0); g.lineTo(640, BH); g.lineTo(0, BH); g.closePath(); g.fill();
      g.beginPath(); g.arc(1000, 360, 140, 0, 7); g.fillStyle = hsl(p.a); g.fill(); g.lineWidth = 8; g.strokeStyle = hsl(p.c); g.stroke(); icon(g, o.f.ic, 920, 280, 160, '#fff', 1.7);
      g.font = `800 28px ${FT}`; g.fillStyle = hsl(p.c); g.fillText(o.eye, M, 134);
      const t = title(g, o, { x: M, y: 176, w: 540, lines: 4, big: 72, small: 40, color: '#fff' });
      sub(g, o, M, Math.min(660, t.bottom + 56), 'rgba(255,255,255,.8)', 30); } },
    { id: 'bauhaus', name: '패턴 · 도형', fam: 'pattern', tone: 'light', draw(g, o) { const p = o.p;
      g.fillStyle = hsl([45, 33, 97]); g.fillRect(0, 0, BW, BH);
      const X = 700, Y = 80, s = 270; g.fillStyle = hsl(p.c); g.beginPath(); g.moveTo(X, Y + s); g.arc(X + s, Y + s, s, Math.PI, Math.PI * 1.5); g.closePath(); g.fill();
      g.fillStyle = hsl(p.b); g.fillRect(X + s, Y, s, s); g.beginPath(); g.arc(X + s * 1.5, Y + s * .5, s * .32, 0, 7); g.fillStyle = '#fff'; g.fill();
      g.fillStyle = hsl([p.c[0], 40, 18]); g.beginPath(); g.arc(X + s * .5, Y + s * 1.5, s * .5, 0, 7); g.fill(); icon(g, o.f.ic, X + s * .5 - 70, Y + s * 1.5 - 70, 140, '#fff', 1.8);
      g.fillStyle = hsl(p.c, .25); g.beginPath(); g.moveTo(X + s, Y + 2 * s); g.lineTo(X + 2 * s, Y + 2 * s); g.lineTo(X + 2 * s, Y + s); g.closePath(); g.fill();
      g.fillStyle = hsl(p.c); g.fillRect(M, 116, 48, 48); g.font = `800 22px ${FT}`; g.fillStyle = hsl([230, 12, 13]); g.fillText(o.eye, M + 66, 150);
      const t = title(g, o, { x: M, y: 216, w: 520, lines: 4, big: 70, small: 40, color: hsl([230, 12, 13]) });
      sub(g, o, M, Math.min(650, t.bottom + 56), hsl([230, 10, 38]), 30); } },
    { id: 'grid', name: '패턴 · 모눈', fam: 'pattern', tone: 'dark', draw(g, o) { const p = o.p;
      g.fillStyle = hsl([p.a[0], 45, 14]); g.fillRect(0, 0, BW, BH);
      g.lineWidth = 1; for (let x = 0; x <= BW; x += 40) { g.strokeStyle = x % 160 ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, BH); g.stroke(); }
      for (let y = 0; y <= BH; y += 40) { g.strokeStyle = y % 160 ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(0, y + .5); g.lineTo(BW, y + .5); g.stroke(); }
      const cx = 960, cy = 360; g.strokeStyle = hsl(p.c, .6); g.lineWidth = 2; g.setLineDash([8, 8]); g.beginPath(); g.arc(cx, cy, 230, 0, 7); g.stroke(); g.beginPath(); g.moveTo(cx - 300, cy); g.lineTo(cx + 300, cy); g.moveTo(cx, cy - 300); g.lineTo(cx, cy + 300); g.stroke(); g.setLineDash([]);
      icon(g, o.f.ic, cx - 150, cy - 150, 300, hsl(p.c), 1.3);
      g.font = `600 18px ui-monospace, Menlo, Consolas, monospace`; g.fillStyle = hsl(p.c, .9); g.fillText('[ ' + o.f.en + ' ]', cx + 120, cy - 250);
      g.font = `800 26px ${FT}`; g.fillStyle = hsl(p.c); spaced(g, o.f.en, M, 130, 4);
      const t = title(g, o, { x: M, y: 170, w: 600, lines: 4, big: 70, small: 40, color: '#fff' });
      sub(g, o, M, Math.min(660, t.bottom + 56), 'rgba(255,255,255,.78)', 30); } },
    /* 내 이미지: 그대로(raw) · 글자 얹기는 'photo'로 그린다 */
    { id: 'raw', name: '내 이미지', fam: 'mine', tone: 'dark', hidden: true, draw(g, o) { g.fillStyle = '#2A2B2B'; g.fillRect(0, 0, BW, BH); cover(g, o.img, 0, 0, BW, BH); } }
  ];
  const TBY = Object.fromEntries(TPL.map(t => [t.id, t]));
  const FAM = { photo: '사진', illust: '일러스트', type: '타이포', grad: '그라데이션', pattern: '패턴', mine: '내 이미지' };
  /* 분야 성격에 맞는 세 번째 추천(타이포 · 그라데이션 · 패턴) */
  const PREF = { ai: ['grid', 'mesh', 'outline'], code: ['grid', 'outline', 'mesh'], data: ['grid', 'card', 'minimal'], math: ['grid', 'bauhaus', 'minimal'], sci: ['grid', 'mesh', 'dots'], sec: ['grid', 'card', 'outline'], tech: ['stripe', 'grid', 'bold'], drone: ['grid', 'stripe', 'mesh'], law: ['card', 'minimal', 'bold'], safe: ['stripe', 'bold', 'card'], biz: ['minimal', 'card', 'bold'], fin: ['minimal', 'card', 'grid'], kids: ['bauhaus', 'dots', 'mesh'], art: ['bauhaus', 'dots', 'mesh'], music: ['mesh', 'outline', 'bauhaus'], design: ['bauhaus', 'mesh', 'outline'], media: ['outline', 'mesh', 'bold'], cook: ['dots', 'bold', 'card'], care: ['dots', 'card', 'minimal'], senior: ['dots', 'card', 'bold'], human: ['minimal', 'bauhaus', 'card'], lang: ['outline', 'dots', 'mesh'] };
  const ILL = { kids: ['sticker', 'center', 'hero'], art: ['sticker', 'center', 'hero'], music: ['sticker', 'hero', 'center'], senior: ['center', 'sticker', 'hero'], care: ['center', 'hero', 'sticker'] };

  /* ───────── 설계(spec) · 그리기 ───────── */
  function recommend(f, seed) {
    const ph = photosOf(f); const s = seed >>> 0;
    const photoT = ['photo', 'split', 'duo', 'frame'][s % 4]; const illT = (ILL[f.k] || ['hero', 'center', 'sticker'])[s % 3]; const pref = PREF[f.k] || ['mesh', 'bold', 'minimal', 'card', 'dots', 'stripe', 'bauhaus', 'outline'];
    const third = pref[s % pref.length];
    const L = [photoT, illT, third]; if (!ph.length) L[0] = pref[(s + 1) % pref.length] === third ? 'bold' : pref[(s + 1) % pref.length];
    return L.map((t, i) => specFor(t, f, s + i * 7, ph));
  }
  function specFor(t, f, seed, ph) {
    ph = ph || photosOf(f); const T = TBY[t] || TBY.mesh; const pool = T.tone === 'light' ? LIGHT : DARK; const s = seed >>> 0;
    return { t: T.id, f: f.k, pal: pool[s % pool.length], ph: T.fam === 'photo' && ph.length ? ph[(s >> 2) % ph.length] : null, s };
  }
  function textOf(d) {
    const name = String((d && (d.name || d.title)) || '').trim() || '새 교육과정';
    let sub = String((d && (d.target || d.who || d.aud)) || '').trim();
    if (sub && !/대상$/.test(sub)) sub = sub.length > 26 ? sub.slice(0, 26) + '…' : sub;
    if (!sub) { const o = org(); sub = o.name ? String(o.name).slice(0, 30) : ''; }
    return { title: name.slice(0, 60), sub };
  }
  async function draw(cv, spec, text, opt) {
    opt = opt || {}; await fonts();
    const f = FBY[spec.f] || FBY.gen; const T = TBY[spec.t] || TBY.mesh; let P = null;
    if (spec.up && opt.upImg) P = { img: opt.upImg, focus: '50% 50%' }; else if (spec.ph) P = await photo(spec.ph);
    if (T.fam === 'photo' && !P) { const alt = photosOf(f); if (alt.length) P = await photo(alt[0]); }
    const g = cv.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.scale(cv.width / BW, cv.height / BH);
    const o = { title: text.title, sub: text.sub, eye: f.n, f, p: palOf(f, spec.pal), img: P, r: rng(spec.s * 2654435761 + 7) };
    try { (spec.up && !spec.txt ? TBY.raw : T).draw(g, o); } catch (e) { console.error('THUMB draw', spec.t, e); }
    g.restore(); return cv;
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function encode(cv0) {
    const tries = [[1280, .82], [1280, .7], [1120, .7], [960, .7], [960, .58], [800, .55], [640, .5]]; let best = null;
    for (const [w, q] of tries) {
      let cv = cv0; if (w !== cv0.width) { cv = canvas(w, Math.round(w * 9 / 16)); cv.getContext('2d').drawImage(cv0, 0, 0, cv.width, cv.height); }
      let u = ''; try { u = cv.toDataURL('image/webp', q); } catch (e) { u = ''; }
      if (!/^data:image\/webp/.test(u)) { try { u = cv.toDataURL('image/jpeg', q); } catch (e) { u = ''; } }
      if (!u) continue; best = { url: u, w: cv.width, h: cv.height }; if (u.length <= LIM) break;
    }
    if (best) best.kb = Math.round(best.url.length * .75 / 1024); return best;
  }
  async function renderFinal(spec, text, upImg) { const cv = canvas(BW, BH); await draw(cv, spec, text, { upImg }); return encode(cv); }

  /* 규칙으로 못 찾으면 Claude에게 분야 키만 묻는다(연결된 경우만, 6초 제한) */
  async function aiField(text) {
    try { if (typeof CL === 'undefined' || !CL.on || !CL.on('chat') || !CL.call) return null; } catch (e) { return null; }
    const keys = FIELDS.map(f => `${f.k}(${f.n})`).join(', ');
    const p = CL.call({ system: '교육과정 이름을 보고 썸네일 디자인 분야를 고른다. 아래 키 가운데 하나만 영문 소문자로 답한다. 다른 말은 쓰지 않는다.\n' + keys, messages: [{ role: 'user', content: String(text).slice(0, 120) }], max: 8 });
    try { const r = await Promise.race([p, new Promise(ok => setTimeout(() => ok(null), 6000))]); const s = String((r && (r.text || (r.content && r.content[0] && r.content[0].text))) || r || '').toLowerCase(); const k = (s.match(/[a-z]+/) || [])[0]; return FBY[k] || null; } catch (e) { return null; }
  }
  const ctxText = d => { let cat = ''; try { if (d && d.cat && typeof c2CatName === 'function') cat = c2CatName(d.cat); } catch (e) { } return [d && (d.name || d.title), d && d.target, cat, d && d.goal].filter(Boolean).join(' '); };

  async function gen(d, opt) {
    opt = opt || {}; const text = textOf(d);
    let f = opt.field ? FBY[opt.field] : null; if (!f) f = detect(ctxText(d)); if (f.k === 'gen' && !opt.noAI) f = (await aiField(text.title)) || f;
    const seed = opt.seed != null ? opt.seed : hash(text.title);
    const spec = recommend(f, seed)[Math.max(0, Math.min(2, opt.k || 0))];
    const r = await renderFinal(spec, text);
    return { ...r, spec, field: f.k, fieldName: f.n, tpl: spec.t, tplName: TBY[spec.t].name };
  }
  const list = () => TPL.filter(t => !t.hidden).map(t => ({ id: t.id, name: t.name, fam: t.fam, famName: FAM[t.fam] }));
  const fields = () => FIELDS.map(f => ({ k: f.k, n: f.n, en: f.en }));
  async function renderSpec(spec, text, w, h) { const cv = canvas(w || 640, h || 360); return draw(cv, spec, typeof text === 'string' ? { title: text, sub: '' } : (text || textOf({})), {}); }

  /* ───────── 고르기 화면 ───────── */
  const UI_IC = {
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/>',
    redo: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
    up: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12l5 5 9-10"/>'
  };
  const ui = (k, s) => `<svg width="${s || 18}" height="${s || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UI_IC[k]}</svg>`;
  let PK = null; /* 열린 고르기 창 상태 */
  const tok = () => (PK ? PK.tok : 0);

  function pick(el, d, onPick) {
    if (PK) close();
    d = d || {}; const text = textOf(d); const f0 = detect(ctxText(d));
    PK = { el: el instanceof Element ? el : null, d, onPick: typeof onPick === 'function' ? onPick : null, title: text.title, sub: text.sub, field: f0.k, seed: hash(text.title), sel: null, up: null, upTxt: false, fam: 'all', tok: 1, ret: document.activeElement };
    const recs = recommend(f0, PK.seed); PK.recs = recs; PK.sel = d.thumbSpec && TBY[d.thumbSpec.t] ? null : recs[0];
    const w = document.createElement('div'); w.className = 'thp-w'; w.id = 'thumbPick';
    w.innerHTML = `<div class="thp" role="dialog" aria-modal="true" aria-labelledby="thpH">
      <header class="thp-h"><div><h2 id="thpH">썸네일 고르기</h2><p>과정명에 맞춰 AI SAM이 디자인했습니다. 마음에 드는 것을 고르고 [이 썸네일 쓰기]를 누르세요.</p></div><button type="button" class="thp-x" data-th="close" aria-label="닫기">${ui('x', 20)}</button></header>
      <div class="thp-b">
        <aside class="thp-l">
          <div class="thp-pv"><canvas id="thpPv" width="960" height="540" aria-label="선택한 썸네일 미리보기"></canvas></div>
          <label class="thp-f"><span>과정명</span><input id="thpName" maxlength="60" value="${E(PK.title)}" autocomplete="off"></label>
          <label class="thp-f"><span>작은 글씨 <em>대상 · 기관명, 비우면 빼요</em></span><input id="thpSub" maxlength="40" value="${E(PK.sub)}" autocomplete="off"></label>
          <label class="thp-f"><span>분야 <em id="thpFAi">AI SAM이 고른 분야</em></span><select id="thpField">${FIELDS.map(f => `<option value="${f.k}" ${f.k === f0.k ? 'selected' : ''}>${E(f.n)}</option>`).join('')}</select></label>
          <div class="thp-lb"><button type="button" class="thp-btn" data-th="regen">${ui('redo')} 다시 만들기</button><label class="thp-btn">${ui('up')} 내 이미지 올리기<input type="file" id="thpFile" accept="image/png,image/jpeg,image/webp,image/gif" hidden></label></div>
          <p class="thp-note">이미지는 이 브라우저에서 디자인해 만듭니다(1280×720 이하 · 약 50KB). 사진은 상업적 이용이 허용된 저장소 사진(CC0)입니다.</p>
        </aside>
        <section class="thp-r" aria-label="썸네일 목록">
          <div class="thp-sh"><h3>${ui('spark', 16)} AI가 만든 추천</h3><span class="thp-m" id="thpFN"></span></div>
          <div class="thp-rec" id="thpRec"></div>
          <div class="thp-mine" id="thpMine" hidden></div>
          <div class="thp-sh"><h3>디자인 템플릿 <b id="thpCnt"></b></h3></div>
          <div class="thp-chips" role="tablist" aria-label="템플릿 종류">${[['all', '전체'], ...Object.entries(FAM).filter(([k]) => k !== 'mine')].map(([k, n]) => `<button type="button" role="tab" data-th="fam" data-v="${k}" aria-selected="${k === 'all'}" class="${k === 'all' ? 'on' : ''}">${E(n)}</button>`).join('')}</div>
          <div class="thp-grid" id="thpGrid"></div>
        </section>
      </div>
      <footer class="thp-ft"><span class="thp-cur" id="thpCur"></span><button type="button" class="thp-btn" data-th="close">취소</button><button type="button" class="thp-pri" data-th="ok">${ui('check')} 이 썸네일 쓰기</button></footer></div>`;
    document.body.appendChild(w); css(); PK.w = w;
    w.addEventListener('click', onClick); w.addEventListener('keydown', onKey);
    const deb = fn => { let t = 0; return () => { clearTimeout(t); t = setTimeout(fn, 220); }; };
    const relive = deb(() => { PK.title = (w.querySelector('#thpName').value || '').trim() || '새 교육과정'; PK.sub = (w.querySelector('#thpSub').value || '').trim(); paintAll(); });
    w.querySelector('#thpName').addEventListener('input', relive); w.querySelector('#thpSub').addEventListener('input', relive);
    w.querySelector('#thpField').addEventListener('change', e => { PK.field = e.target.value; w.querySelector('#thpFAi').textContent = '직접 고른 분야'; rebuild(true); });
    w.querySelector('#thpFile').addEventListener('change', e => upload(e.target.files && e.target.files[0]));
    rebuild(false); setTimeout(() => { try { w.querySelector('#thpName').focus(); } catch (e) { } }, 30);
    if (f0.k === 'gen') aiField(PK.title).then(f => { if (!f || !PK || PK.field !== 'gen') return; PK.field = f.k; const s = w.querySelector('#thpField'); if (s) s.value = f.k; rebuild(true); });
    return { close, el: w };
  }
  function keyOf(s) { return s ? [s.t, s.f, s.pal, s.ph || '', s.up ? 'u' + (s.txt ? 1 : 0) : ''].join('|') : ''; }
  function rebuild(resetSel) {
    if (!PK) return; const f = FBY[PK.field] || FBY.gen; const w = PK.w; PK.recs = recommend(f, PK.seed);
    if (resetSel || !PK.sel) PK.sel = PK.recs[0];
    w.querySelector('#thpFN').textContent = `${f.n} · 시안 ${((PK.seed - hash(PK.title)) >>> 0) % 1000 + 1}`;
    w.querySelector('#thpRec').innerHTML = PK.recs.map((s, i) => card(s, `추천 ${i + 1}`, TBY[s.t].name, true)).join('');
    gridHtml(); mineHtml(); paintAll();
  }
  function gridHtml() {
    const f = FBY[PK.field] || FBY.gen; const L = list().filter(t => PK.fam === 'all' || t.fam === PK.fam);
    PK.grid = L.map((t, i) => specFor(t.id, f, PK.seed + 11 + i * 3));
    PK.w.querySelector('#thpGrid').innerHTML = PK.grid.map(s => card(s, FAM[TBY[s.t].fam], TBY[s.t].name)).join('');
    PK.w.querySelector('#thpCnt').textContent = `${L.length}개`;
  }
  function mineHtml() {
    const box = PK.w.querySelector('#thpMine'); if (!PK.up) { box.hidden = true; box.innerHTML = ''; return; } box.hidden = false;
    const a = { t: 'raw', f: PK.field, pal: 0, s: 1, up: true, txt: false }, b = { t: 'photo', f: PK.field, pal: 0, s: 1, up: true, txt: true };
    PK.mine = [a, b]; box.innerHTML = `<div class="thp-sh"><h3>내 이미지</h3></div><div class="thp-rec two">${card(a, '내 이미지', '그대로 쓰기')}${card(b, '내 이미지', '과정명 글자 얹기')}</div>`;
  }
  function card(s, tag, name, rec) {
    const on = keyOf(s) === keyOf(PK.sel);
    return `<button type="button" class="thp-c ${on ? 'on' : ''} ${rec ? 'rec' : ''}" data-th="sel" data-k="${E(JSON.stringify(s))}" aria-pressed="${on}" aria-label="${E(name)} ${E(tag)}"><span class="thp-cv"><canvas width="480" height="270" data-k="${E(keyOf(s))}"></canvas><i class="thp-ok">${ui('check', 16)}</i></span><span class="thp-cn"><b>${E(name)}</b><small>${rec ? ui('spark', 12) + ' ' : ''}${E(tag)}</small></span></button>`;
  }
  async function paintAll() {
    if (!PK) return; const my = ++PK.tok; const w = PK.w; const text = { title: PK.title, sub: PK.sub };
    const all = [...PK.recs, ...(PK.mine || []).filter(() => PK.up), ...PK.grid]; const byK = {}; all.forEach(s => { byK[keyOf(s)] = s; });
    paintSel();
    const cvs = [...w.querySelectorAll('.thp-c canvas')];
    for (const cv of cvs) { if (!PK || PK.tok !== my) return; const s = byK[cv.dataset.k]; if (s) await draw(cv, s, text, { upImg: PK.up && PK.up.img }); }
  }
  async function paintSel() {
    if (!PK || !PK.sel) return; const w = PK.w; const cv = w.querySelector('#thpPv'); await draw(cv, PK.sel, { title: PK.title, sub: PK.sub }, { upImg: PK.up && PK.up.img });
    const nm = PK.sel.up ? (PK.sel.txt ? '내 이미지 · 과정명 글자 얹기' : '내 이미지 · 그대로') : `${TBY[PK.sel.t].name} · ${(FBY[PK.sel.f] || FBY.gen).n}`;
    w.querySelector('#thpCur').innerHTML = `선택: <b>${E(nm)}</b>`;
  }
  function select(s) {
    PK.sel = s; const k = keyOf(s); PK.w.querySelectorAll('.thp-c').forEach(b => { const on = b.querySelector('canvas').dataset.k === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); paintSel();
  }
  function upload(file) {
    if (!file || !PK) return; if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) { say('PNG · JPG · WEBP · GIF 이미지만 올릴 수 있습니다.', 'warn'); return; }
    if (file.size > 20 * 1024 * 1024) { say('20MB 이하 이미지를 올려 주세요.', 'warn'); return; }
    if (W.HPM && typeof HPM.check === 'function') { try { const c = HPM.check(file); if (c && c.ok === false && !/^image\//.test(file.type)) { say(c.msg || '올릴 수 없는 파일입니다.', 'warn'); return; } } catch (e) { } }
    const url = URL.createObjectURL(file); const im = new Image();
    im.onload = () => { if (!PK) return; PK.up = { img: im, name: file.name }; mineHtml(); select(PK.mine[0]); paintAll(); say('이미지를 올렸습니다. 16:9로 맞춰 자르고, 위치 정보 같은 메타데이터는 지웁니다.'); };
    im.onerror = () => say('이미지를 읽지 못했습니다.', 'warn'); im.src = url;
  }
  async function confirmPick() {
    if (!PK || !PK.sel) return; const btn = PK.w.querySelector('[data-th="ok"]'); btn.disabled = true; btn.textContent = '만드는 중…';
    try {
      const st = PK; const r = await renderFinal(st.sel, { title: st.title, sub: st.sub }, st.up && st.up.img);
      if (!r) throw new Error('encode');
      const spec = { ...st.sel }; delete spec.up; if (st.sel.up) spec.mine = true;
      const meta = { url: r.url, w: r.w, h: r.h, kb: r.kb, spec, field: st.sel.f, tpl: st.sel.up ? 'mine' : st.sel.t, tplName: st.sel.up ? '내 이미지' : TBY[st.sel.t].name };
      if (st.d && typeof st.d === 'object') { st.d.thumb = r.url; st.d.thumbSpec = spec; }
      const el = st.el, cb = st.onPick; close();
      if (cb) { try { cb(r.url, meta); } catch (e) { console.error(e); } }
      if (el) { try { el.dispatchEvent(new CustomEvent('thumb:pick', { bubbles: true, detail: meta })); } catch (e) { } }
    } catch (e) { console.error('THUMB pick', e); if (PK) { btn.disabled = false; btn.innerHTML = `${ui('check')} 이 썸네일 쓰기`; } say('썸네일을 만들지 못했습니다. 다른 디자인을 골라 주세요.', 'warn'); }
  }
  function onClick(e) {
    if (!PK) return; if (e.target === PK.w) { close(); return; }
    const b = e.target.closest('[data-th]'); if (!b) return; const a = b.dataset.th;
    if (a === 'close') close();
    else if (a === 'ok') confirmPick();
    else if (a === 'regen') { PK.seed = (PK.seed + 0x9e37) >>> 0; rebuild(true); say('새 시안을 만들었습니다.'); }
    else if (a === 'fam') { PK.fam = b.dataset.v; PK.w.querySelectorAll('.thp-chips button').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); }); gridHtml(); paintAll(); }
    else if (a === 'sel') { try { select(JSON.parse(b.dataset.k)); } catch (er) { } }
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') { const F = [...PK.w.querySelectorAll('button:not([disabled]),input,select,label.thp-btn')].filter(x => x.offsetParent !== null); if (!F.length) return; const i = F.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); F[F.length - 1].focus(); } else if (!e.shiftKey && i === F.length - 1) { e.preventDefault(); F[0].focus(); } }
  }
  function close() { if (!PK) return; const r = PK.ret; try { PK.w.remove(); } catch (e) { } PK = null; try { r && r.focus && r.focus(); } catch (e) { } }

  function css() {
    if (document.getElementById('thpCss')) return; const s = document.createElement('style'); s.id = 'thpCss';
    s.textContent = `
.thp-w{position:fixed;inset:0;z-index:1200;background:rgba(20,21,24,.56);display:flex;align-items:center;justify-content:center;padding:24px}
.thp{background:#fff;border-radius:12px;width:min(1180px,100%);height:min(860px,100%);display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.28);overflow:hidden;color:#2A2B2B;font-family:"Pretendard Variable",Pretendard,sans-serif}
.thp-h{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid #EAEBEB}
.thp-h h2{margin:0;font-size:22px;line-height:30px;font-weight:700}.thp-h p{margin:4px 0 0;color:#6C6C6C;font-size:14px;line-height:20px}
.thp-x{flex:none;width:44px;height:44px;border:0;border-radius:8px;background:#F6F7F7;color:#4C4D4D;cursor:pointer;display:grid;place-items:center}.thp-x:hover{background:#EAEBEB}
.thp-b{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,380px) minmax(0,1fr)}.thp canvas{max-width:100%}
.thp-l{padding:20px 24px;border-right:1px solid #EAEBEB;overflow:auto;display:flex;flex-direction:column;gap:14px;background:#FBFCFC}
.thp-pv{position:relative;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08);background:#F1F2F2}.thp-pv canvas{display:block;width:100%;height:auto;aspect-ratio:16/9}
.thp-pvt{position:absolute;left:8px;bottom:8px;max-width:calc(100% - 16px);background:rgba(42,43,43,.78);color:#fff;font-size:12px;line-height:16px;padding:4px 8px;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.thp-f{display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600}.thp-f em{font-style:normal;font-weight:500;color:#808181;font-size:12px;margin-left:6px}
.thp-f input,.thp-f select{height:48px;border:1px solid #C8C9C9;border-radius:4px;padding:0 12px;font:inherit;font-weight:500;font-size:16px;background:#fff;color:#2A2B2B;min-width:0}
.thp-f input:focus,.thp-f select:focus{outline:2px solid #5C74F6;outline-offset:0;border-color:#5C74F6}
.thp-lb{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.thp-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:48px;padding:0 14px;border:1px solid #C8C9C9;border-radius:4px;background:#fff;color:#2A2B2B;font:inherit;font-size:15px;font-weight:600;cursor:pointer;white-space:nowrap}.thp-btn:hover{background:#F6F7F7}
.thp-btn:focus-within,.thp-btn:focus-visible{outline:2px solid #5C74F6;outline-offset:1px}
.thp-note{margin:0;font-size:12px;line-height:18px;color:#808181}
.thp-r{overflow:auto;padding:20px 24px 24px}
.thp-sh{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0 10px}.thp-sh h3{margin:0;font-size:17px;line-height:24px;font-weight:700;display:flex;align-items:center;gap:6px}.thp-sh h3 b{font-weight:600;color:#808181;font-size:14px}.thp-sh h3 svg{color:#5C74F6}
.thp-m{font-size:13px;color:#6C6C6C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.thp-rec{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:22px}.thp-rec.two{grid-template-columns:repeat(2,minmax(0,1fr));max-width:66%}
.thp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.thp-chips{display:flex;gap:6px;overflow-x:auto;margin:0 0 12px;padding-bottom:2px;scrollbar-width:none}.thp-chips::-webkit-scrollbar{display:none}
.thp-chips button{flex:none;height:36px;padding:0 14px;border:1px solid #E0E0E0;border-radius:999px;background:#fff;color:#4C4D4D;font:inherit;font-size:14px;font-weight:600;cursor:pointer}.thp-chips button.on{background:#2A2B2B;border-color:#2A2B2B;color:#fff}
.thp-c{display:flex;flex-direction:column;gap:6px;padding:0;border:0;background:none;text-align:left;cursor:pointer;font:inherit;color:inherit;min-width:0}
.thp-cv{position:relative;display:block;border-radius:8px;overflow:hidden;box-shadow:0 0 0 1px #EAEBEB;transition:box-shadow .15s,transform .15s;background:#F1F2F2}
.thp-cv canvas{display:block;width:100%;height:auto;aspect-ratio:16/9}
.thp-c:hover .thp-cv{transform:translateY(-2px);box-shadow:0 0 0 1px #C8C9C9,0 6px 16px rgba(0,0,0,.1)}
.thp-c.on .thp-cv{box-shadow:0 0 0 3px #5C74F6}.thp-c:focus-visible{outline:none}.thp-c:focus-visible .thp-cv{box-shadow:0 0 0 3px #2A2B2B}
.thp-ok{position:absolute;right:8px;top:8px;width:28px;height:28px;border-radius:50%;background:#5C74F6;color:#fff;display:none;place-items:center}.thp-c.on .thp-ok{display:grid}
.thp-ai{position:absolute;left:8px;top:8px;display:inline-flex;gap:3px;align-items:center;height:24px;padding:0 8px;border-radius:4px;background:rgba(255,255,255,.94);color:#1E30A0;font-style:normal;font-size:12px;font-weight:700}
.thp-cn{display:flex;align-items:baseline;justify-content:space-between;gap:6px;min-width:0}.thp-cn b{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.thp-cn small{flex:none;font-size:12px;color:#808181;display:inline-flex;align-items:center;gap:2px}.thp-c.rec .thp-cn small{color:#1E30A0;font-weight:600}
.thp-ft{display:flex;align-items:center;gap:8px;padding:12px 24px;border-top:1px solid #EAEBEB;background:#fff}
.thp-cur{flex:1;min-width:0;font-size:14px;color:#6C6C6C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.thp-cur b{color:#2A2B2B}
.thp-pri{display:inline-flex;align-items:center;gap:6px;min-height:48px;padding:0 20px;border:0;border-radius:4px;background:#4C4D4D;color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer;white-space:nowrap}.thp-pri:hover{background:#2A2B2B}.thp-pri:disabled{background:#C8C9C9;cursor:default}
.th-slot{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}.th-slot img,.th-slot .th-slot0{width:240px;aspect-ratio:16/9;border-radius:8px;object-fit:cover;background:#F1F2F2;box-shadow:0 0 0 1px #EAEBEB;flex:none}
.th-slot .th-slot0{display:grid;place-items:center;color:#808181;font-size:13px}.th-slot .th-sb{display:flex;flex-direction:column;gap:8px;min-width:0}.th-slot .th-sb .row{display:flex;gap:8px;flex-wrap:wrap}.th-slot p{margin:0;font-size:13px;color:#6C6C6C;line-height:19px}
@media (max-width:900px){.thp-w{padding:0}.thp{width:100%;height:100%;border-radius:0}.thp-b{grid-template-columns:minmax(0,1fr);overflow:auto}.thp-h p{font-size:13px}.thp-l{border-right:0;border-bottom:1px solid #EAEBEB;overflow:visible;padding:16px}.thp-r{overflow:visible;padding:16px}.thp-h{padding:14px 16px 12px}.thp-h h2{font-size:20px}.thp-ft{padding:10px 16px}.thp-rec{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.thp-rec.two{max-width:none}}
@media (max-width:560px){.thp-rec{grid-template-columns:repeat(2,minmax(0,1fr))}.thp-rec:not(.two) .thp-c:first-child{grid-column:1/-1}.thp-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.thp-c:not(.rec) .thp-cn small{display:none}.thp-cur{display:none}.thp-ft .thp-btn{flex:1}.thp-pri{flex:2;justify-content:center}.th-slot img,.th-slot .th-slot0{width:100%}}
`;
    document.head.appendChild(s);
  }

  /* 작은 썸네일 자리(과정 설정 · 흐름에서 쓸 수 있는 HTML) — data-act="thumb-pick"(data-t=과정 id) */
  function slot(c, act) { const src = c && c.thumb; return `<div class="th-slot">${src ? `<img src="${E(src)}" alt="현재 썸네일">` : '<span class="th-slot0">썸네일 없음</span>'}<div class="th-sb"><div class="row"><button type="button" class="btn sm pri" data-act="${E(act || 'thumb-pick')}" data-t="${E(c && c.id || '')}">✦ 썸네일 고르기 · AI로 만들기</button></div><p>과정명에 맞춘 AI 디자인 16가지 가운데 고르거나 내 이미지를 올립니다.</p></div></div>`; }

  try { if (document.head) css(); } catch (e) { }
  const THUMB = W.THUMB = { gen, pick, list, fields, detect: t => { const f = detect(t); return { k: f.k, n: f.n }; }, render: renderSpec, recommend: (t, seed) => recommend(detect(t), seed == null ? hash(t) : seed), slot, close, LIM, v: '36.0' };
  void THUMB; void eyebrow;

  /* ───────── 연결: 과정 상세 설정(cls2) · 과정 만들기 흐름(CF) ───────── */
  try {
    if (typeof ACT !== 'undefined') {
      ACT['thumb-pick'] = el => { const id = el && el.dataset.t; const c = id && typeof C === 'function' ? C(id) : null; if (!c) return;
        pick(el, { name: c.name, target: c.target || '', cat: c.cat, goal: c.goal || '', thumbSpec: c.thumbSpec }, (url, meta) => { const cc = C(id); if (!cc) return; cc.thumb = url; cc.thumbSpec = meta.spec; try { logAudit(`${cc.name} 썸네일 변경(${meta.tplName})`); } catch (e) { } try { save(); W.render(); } catch (e) { } say('썸네일을 바꿨습니다.'); }); };
    }
  } catch (e) { }
  /* 썸네일 없이 만든 과정은 AI 추천 1번을 자동으로 넣는다(만든 뒤 상세 설정에서 바꿀 수 있음) */
  try {
    if (W.CF && typeof CF.on === 'function') CF.on('create', x => { const c = x && x.course; if (!c || c.thumb) return; const d = x.d || {}; gen({ name: c.name, target: d.target || c.target || '', cat: c.cat, goal: c.goal || '' }, { noAI: true }).then(r => { if (!r || c.thumb) return; c.thumb = r.url; c.thumbSpec = r.spec; try { save(); } catch (e) { } try { if (typeof W.render === 'function' && !document.querySelector('.cf-wrap,.cf-w,#thumbPick')) W.render(); } catch (e) { } }).catch(() => { }); });
  } catch (e) { }
})();
