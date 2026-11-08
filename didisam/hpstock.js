/* v34.5 hpstock — 템플릿용 샘플 사진 목록(window.HPSTOCK) · 개발 요원 P 작업 파일
 * 사진: didisam/img/stock/<id>.webp(긴 변 1600) · <id>-800.webp(긴 변 800). 라이선스 · 출처는 docs/stock-credits.md.
 * 원칙: '분위기 사진'으로만 쓴다. 강사 · 수강생 · 시설 실물처럼 보이게 이름 · 캡션을 붙이지 않는다.
 *
 * 사용법
 *   HPSTOCK.forScene('univ', 'campus', 'hero')            → 사진 1장(객체) — 기관 유형 · 장면 키워드 · 슬롯으로 고름
 *   HPSTOCK.forScene('k12', '미술 학원', 'card', { n: 3, seed: S.org.name, exclude: ['art-01'] }) → 배열
 *   HPSTOCK.pick(['코딩', 'voc'], 4, 'seed')              → 태그 · 분류 · 유형 · 슬롯 아무거나 섞어서 n장
 *   HPSTOCK.slotImg(item, 'hero')                         → site.img[slot] 값 { src, alt, fit, pos, stock: id }
 *   HPSTOCK.url(item, 'sm')                               → 800px 주소('sm') 또는 1600px 주소(기본). 절대 주소
 *   HPSTOCK.isStock(src) · HPSTOCK.count(site)            → 샘플 사진 여부 · 사이트에 남은 샘플 사진 수(품질 안내용)
 *   HPSTOCK.TYPES · HPSTOCK.SLOTS · HPSTOCK.CATS          → 분류 체계
 * item 필드: { id, src, src800, w, h, focus:'50% 40%', tone:'light'|'dark', cat, tags[], types[], slots[], alt, credit:{ by, url, license } }
 *   src · src800 은 didisam/ 기준 상대 경로(index.html · learner.html 과 같은 폴더). 다른 문서(srcdoc iframe 등)에서는 url()의 절대 주소를 쓴다.
 *   tone 은 사진 전체 밝기(dark면 흰 글자를 바로 올려도 되는 편, light면 스크림 필요).
 */
(function () {
  'use strict';
  var BASE = (function () {
    try { var s = document.currentScript && document.currentScript.src; if (s) return s.replace(/[?#].*$/, '').replace(/[^/]*$/, ''); } catch (e) {}
    try { return location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, ''); } catch (e) { return ''; }
  })();
  var LIST = [
  {"id":"art-01","src":"img/stock/art-01.webp","src800":"img/stock/art-01-800.webp","w":1600,"h":1067,"focus":"55% 45%","tone":"light","cat":"art","tags":["미술","수채화","손","취미"],"types":["lifelong","k12","adult"],"slots":["hero","card","about"],"alt":"붓으로 수채화를 칠하는 손","credit":{"by":"Bench Accounting benchaccounting","url":"https://commons.wikimedia.org/wiki/File:Bench_Accounting_2015-11-30_(Unsplash_unG80SBSfMU).jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"art-02","src":"img/stock/art-02.webp","src800":"img/stock/art-02-800.webp","w":1440,"h":1080,"focus":"50% 45%","tone":"dark","cat":"art","tags":["미술","팔레트","물감","색"],"types":["k12","lifelong","adult"],"slots":["card","gallery","about"],"alt":"여러 색 물감이 묻은 팔레트와 붓","credit":{"by":"Mike Petrucci mikepetrucci","url":"https://commons.wikimedia.org/wiki/File:Mix_of_paints_(Unsplash).jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"cam-01","src":"img/stock/cam-01.webp","src800":"img/stock/cam-01-800.webp","w":1440,"h":1084,"focus":"50% 45%","tone":"light","cat":"campus","tags":["캠퍼스","건물","벽돌","가을"],"types":["univ"],"slots":["about","gallery"],"alt":"가을 나무 사이 벽돌 캠퍼스 건물","credit":{"by":"Sammi Brie","url":"https://commons.wikimedia.org/wiki/File:Communications_Building,_University_of_Washington.jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"cam-02","src":"img/stock/cam-02.webp","src800":"img/stock/cam-02-800.webp","w":1440,"h":1126,"focus":"45% 45%","tone":"dark","cat":"campus","tags":["캠퍼스","담쟁이","석조","전통"],"types":["univ"],"slots":["about","gallery"],"alt":"담쟁이가 덮인 석조 학교 건물","credit":{"by":"Julian Lupyan","url":"https://commons.wikimedia.org/wiki/File:Ivy_Covered_Building_in_the_Princeton_University_Campus,_New_Jersey.jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"civ-01","src":"img/stock/civ-01.webp","src800":"img/stock/civ-01-800.webp","w":1440,"h":1080,"focus":"50% 50%","tone":"light","cat":"civic","tags":["공공건물","청사","석조","정면"],"types":["public"],"slots":["about","gallery"],"alt":"정면에서 본 석조 공공 청사","credit":{"by":"W2z","url":"https://commons.wikimedia.org/wiki/File:Kyoto_City_Hall_Main_Building_2025.jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"cls-01","src":"img/stock/cls-01.webp","src800":"img/stock/cls-01-800.webp","w":1600,"h":1200,"focus":"45% 60%","tone":"dark","cat":"classroom","tags":["강의실","세미나","밝음","책상"],"types":["adult","voc","univ","lifelong"],"slots":["hero","space","card"],"alt":"창가 햇빛이 드는 빈 강의실 책상","credit":{"by":"Kurt Kaiser","url":"https://commons.wikimedia.org/wiki/File:Austin_Community_College_Highland_Mall_Campus_4.jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"cls-02","src":"img/stock/cls-02.webp","src800":"img/stock/cls-02-800.webp","w":1600,"h":900,"focus":"50% 50%","tone":"light","cat":"classroom","tags":["교실","모던","화이트","전자칠판"],"types":["k12","adult","lifelong"],"slots":["space","about","card"],"alt":"흰 책상과 큰 화면이 있는 깔끔한 교실","credit":{"by":"Mertbiol","url":"https://commons.wikimedia.org/wiki/File:Independent_study_room_(MH105),_Ashtead_House,_City_of_London_Freemen%27s_School,_Ashtead,_Surrey_-_September_2025.jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"cls-03","src":"img/stock/cls-03.webp","src800":"img/stock/cls-03-800.webp","w":1600,"h":900,"focus":"45% 60%","tone":"dark","cat":"classroom","tags":["교실","소규모","화면","책상"],"types":["k12","adult","voc"],"slots":["space","card","gallery"],"alt":"모둠 책상과 대형 화면이 있는 교실","credit":{"by":"Mertbiol","url":"https://commons.wikimedia.org/wiki/File:Teaching_room_(MH101),_Ashtead_Park_House,_City_of_London_Freeman%27s_School,_Ashtead,_Surrey_-_September_2025.jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"cod-01","src":"img/stock/cod-01.webp","src800":"img/stock/cod-01-800.webp","w":1600,"h":1067,"focus":"60% 50%","tone":"dark","cat":"coding","tags":["코딩","화면","IT","부트캠프"],"types":["voc","adult","univ"],"slots":["hero","card","about"],"alt":"화면에 가득한 프로그램 코드","credit":{"by":"Markus Spiske markusspiske","url":"https://commons.wikimedia.org/wiki/File:Code_on_computer_monitor_(Unsplash).jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"lap-01","src":"img/stock/lap-01.webp","src800":"img/stock/lap-01-800.webp","w":1600,"h":987,"focus":"50% 45%","tone":"light","cat":"laptop","tags":["노트북","책상","플랫레이","온라인"],"types":["adult","corp","voc"],"slots":["hero","card","about"],"alt":"책상 위 노트북과 노트, 연필","credit":{"by":"www.Pixel.la Free Stock Photos","url":"https://commons.wikimedia.org/wiki/File:Apple-desk-laptop-macbook-pro_(23699397893).jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"lap-02","src":"img/stock/lap-02.webp","src800":"img/stock/lap-02-800.webp","w":1600,"h":1067,"focus":"35% 55%","tone":"light","cat":"laptop","tags":["노트북","책장","공부","나무"],"types":["adult","univ","lifelong"],"slots":["hero","card","about"],"alt":"책장 앞 나무 책상 위 노트북","credit":{"by":"www.Pixel.la Free Stock Photos","url":"https://commons.wikimedia.org/wiki/File:Desk-laptop-notebook-table_(23697249344).jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"lap-03","src":"img/stock/lap-03.webp","src800":"img/stock/lap-03-800.webp","w":1600,"h":1067,"focus":"35% 45%","tone":"dark","cat":"laptop","tags":["노트북","손","타이핑","업무"],"types":["adult","corp","voc"],"slots":["hero","about","card"],"alt":"나무 책상에서 노트북으로 타이핑하는 손","credit":{"by":"Alejandro Escamilla alejandroescamilla","url":"https://commons.wikimedia.org/wiki/File:Man_typing_on_laptop_(Unsplash).jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"lap-04","src":"img/stock/lap-04.webp","src800":"img/stock/lap-04-800.webp","w":1600,"h":1067,"focus":"55% 50%","tone":"light","cat":"desk","tags":["노트","플랫레이","화이트","미니멀"],"types":["adult","corp","univ"],"slots":["hero","card","about"],"alt":"흰 책상 위 펼친 노트와 연필, 안경","credit":{"by":"JESHOOTS.COM jeshoots","url":"https://commons.wikimedia.org/wiki/File:White_work_table_with_notes,_smartphone_and_laptop_(Unsplash).jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"lec-01","src":"img/stock/lec-01.webp","src800":"img/stock/lec-01-800.webp","w":1600,"h":1067,"focus":"50% 55%","tone":"light","cat":"lecture","tags":["강의실","대형강의","모던","밝음"],"types":["univ","public","corp"],"slots":["hero","space","about"],"alt":"조명이 길게 이어진 현대식 강의실","credit":{"by":"ManoBV16","url":"https://commons.wikimedia.org/wiki/File:AI_Classroom_at_Universal_Ai_University.jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"lib-01","src":"img/stock/lib-01.webp","src800":"img/stock/lib-01-800.webp","w":1600,"h":900,"focus":"50% 55%","tone":"light","cat":"library","tags":["도서관","라운지","책","편안함"],"types":["univ","lifelong","public"],"slots":["hero","space","about"],"alt":"소파와 서가가 있는 밝은 도서관 라운지","credit":{"by":"Mertbiol","url":"https://commons.wikimedia.org/wiki/File:Informal_seating_in_library,_Davison_Building,_Royal_Holloway_University_of_London,_Surrey_-_September_2026_-_01.jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"lib-02","src":"img/stock/lib-02.webp","src800":"img/stock/lib-02-800.webp","w":1600,"h":1195,"focus":"60% 55%","tone":"dark","cat":"library","tags":["도서관","서가","곡선","라운지"],"types":["lifelong","public","univ"],"slots":["space","about","gallery"],"alt":"곡선 서가가 이어진 도서관 열람 공간","credit":{"by":"Bbfd","url":"https://commons.wikimedia.org/wiki/File:New_Books_Undergraduate_Library_UNCCH_20141009.jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"off-01","src":"img/stock/off-01.webp","src800":"img/stock/off-01-800.webp","w":1600,"h":1067,"focus":"50% 60%","tone":"light","cat":"office","tags":["회의실","기업","화이트","모던"],"types":["corp","public"],"slots":["hero","space","about"],"alt":"창이 큰 흰 회의실과 긴 테이블","credit":{"by":"Breather breather","url":"https://commons.wikimedia.org/wiki/File:Minimalist_meeting_room_(Unsplash).jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"sem-01","src":"img/stock/sem-01.webp","src800":"img/stock/sem-01-800.webp","w":1600,"h":900,"focus":"50% 60%","tone":"dark","cat":"seminar","tags":["세미나실","원탁","워크숍","모던"],"types":["corp","lifelong","adult","public"],"slots":["space","about","card"],"alt":"원탁이 놓인 세미나실","credit":{"by":"Mertbiol","url":"https://commons.wikimedia.org/wiki/File:Seminar_Room_1-04,_Davison_Building,_Royal_Holloway_University_of_London,_Surrey_-_September_2026_-_01.jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"sen-01","src":"img/stock/sen-01.webp","src800":"img/stock/sen-01-800.webp","w":1280,"h":960,"focus":"50% 40%","tone":"dark","cat":"senior","tags":["시니어","산책","뒷모습","여가"],"types":["lifelong","public"],"slots":["hero","about","card"],"alt":"배낭을 메고 함께 걷는 시니어 두 사람의 뒷모습","credit":{"by":"pasja1000-6355831 (Pixabay)","url":"https://commons.wikimedia.org/wiki/File:Senior-3336451_1920.jpg","license":"CC0 1.0","via":"Wikimedia Commons"}},
  {"id":"voc-01","src":"img/stock/voc-01.webp","src800":"img/stock/voc-01-800.webp","w":1600,"h":1067,"focus":"40% 55%","tone":"dark","cat":"vocational","tags":["용접","현장","기술","어두움"],"types":["voc"],"slots":["hero","about","card"],"alt":"보호 장비를 쓰고 용접하는 작업 현장","credit":{"by":"Mostafameraji","url":"https://commons.wikimedia.org/wiki/File:Construction_workers_in_Iran_06.jpg","license":"CC0 1.0","via":"Wikimedia Commons"}}
  ];
  var TYPES = ['adult', 'k12', 'univ', 'lifelong', 'voc', 'corp', 'public'];
  var SLOTS = ['hero', 'about', 'card', 'space', 'gallery'];
  // 장면 분류(cat) — 이름과 고를 때 쓰는 낱말
  var CATS = {
    lecture: { name: '대형 강의실', kw: ['강의실', '강당', '대강의', '특강', 'lecture', '강연'] },
    classroom: { name: '강의실 · 교실', kw: ['교실', '강의', '학원', '수업', '보습', '입시', '자격증', 'class'] },
    seminar: { name: '세미나 · 워크숍', kw: ['세미나', '워크숍', '토론', '모임', '스터디', '코칭', '컨설팅'] },
    laptop: { name: '노트북 학습', kw: ['온라인', '이러닝', '노트북', '원격', '인강', 'e러닝', '디지털', 'lms'] },
    desk: { name: '책상 · 필기', kw: ['노트', '필기', '공부', '시험', '자격', '어학', '글쓰기', '논술'] },
    library: { name: '도서관 · 책', kw: ['도서', '도서관', '독서', '책', '인문', '문해', '논술'] },
    campus: { name: '캠퍼스 건물', kw: ['대학', '캠퍼스', '학과', '교수', '비교과', '대학원', 'university'] },
    coding: { name: '코딩 · IT', kw: ['코딩', '개발', 'it', 'ai', '데이터', '프로그래밍', '부트캠프', 'sw', '소프트웨어'] },
    art: { name: '미술 · 공예', kw: ['미술', '그림', '드로잉', '디자인', '공예', '도예', '캘리', '수채'] },
    music: { name: '음악', kw: ['음악', '피아노', '기타', '보컬', '실용음악', '악기', '합창'] },
    kids: { name: '어린이 학습 도구', kw: ['유아', '어린이', '초등', '키즈', '아동', '놀이', '블록', '방과후'] },
    senior: { name: '시니어 · 여가', kw: ['시니어', '어르신', '노인', '실버', '은퇴', '여가', '평생', '장년'] },
    civic: { name: '도시 · 공공 건물', kw: ['공공', '시청', '구청', '공무원', '시민', '주민', '행정', '청사', '도시'] },
    office: { name: '기업 회의실', kw: ['기업', '회의', '직무', 'hrd', '사내', '임직원', '리더십', '온보딩', '법정교육', '연수'] },
    vocational: { name: '현장 직업훈련', kw: ['직업', '훈련', '기술', '용접', '정비', '전기', '기계', '내일배움', '국비', '현장', '자동차'] },
    workshop: { name: '실습 · 공방', kw: ['실습', '공방', '공구', '목공', '메이커', '제작', '실기'] },
    nature: { name: '자연 · 정원', kw: ['자연', '정원', '숲', '원예', '산책', '힐링', '생태'] },
    texture: { name: '질감 · 배경', kw: ['배경', '질감', '패턴'] }
  };
  // 기관 유형별 기본 장면(장면 키워드가 없을 때)
  var TYPE_CATS = {
    adult: ['laptop', 'desk', 'classroom', 'seminar', 'coding', 'art'],
    k12: ['kids', 'classroom', 'desk', 'art', 'library', 'music'],
    univ: ['campus', 'lecture', 'library', 'seminar', 'laptop'],
    lifelong: ['senior', 'library', 'art', 'music', 'seminar', 'nature'],
    voc: ['vocational', 'workshop', 'coding', 'classroom', 'laptop'],
    corp: ['office', 'seminar', 'laptop', 'desk', 'lecture'],
    public: ['civic', 'lecture', 'library', 'seminar', 'senior']
  };
  var BY = {}; LIST.forEach(function (x) { BY[x.id] = x; });

  function hash(s) { s = String(s == null ? '' : s); var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = hash(seed) || 1; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function low(s) { return String(s || '').toLowerCase(); }
  // 자유 낱말(템플릿 scene · 기관명 · 설명 등) → 장면 분류 목록
  function catsOf(words) {
    var t = low(Array.isArray(words) ? words.join(' ') : words), out = [];
    if (!t) return out;
    Object.keys(CATS).forEach(function (c) { if (c === t || CATS[c].kw.some(function (k) { return t.indexOf(k) >= 0; })) out.push(c); });
    return out;
  }
  function score(x, o) {
    var s = 0;
    if (o.type) s += x.types.indexOf(o.type) >= 0 ? 3 : -1;
    if (o.slot) { s += x.slots.indexOf(o.slot) >= 0 ? 2 : 0; if (o.slot === 'hero' && x.w < 1200) s -= 6; }
    if (o.cats && o.cats.length) { var i = o.cats.indexOf(x.cat); if (i >= 0) s += 6 - Math.min(i, 3); }
    if (o.words) o.words.forEach(function (w) { if (w && (x.tags.indexOf(w) >= 0 || x.cat === w || x.types.indexOf(w) >= 0 || x.slots.indexOf(w) >= 0)) s += 2; });
    if (o.tone && x.tone === o.tone) s += 1;
    return s;
  }
  function rank(o, n, seed) {
    var r = rng(seed), ex = o.exclude || [];
    var arr = LIST.filter(function (x) { return ex.indexOf(x.id) < 0; }).map(function (x) { return { x: x, s: score(x, o) + r() * 1.5 }; });
    arr.sort(function (a, b) { return b.s - a.s; });
    return arr.slice(0, n).map(function (a) { return a.x; });
  }
  var H = {
    list: LIST, TYPES: TYPES, SLOTS: SLOTS, CATS: CATS, TYPE_CATS: TYPE_CATS, base: BASE,
    get: function (id) { return BY[id] || null; },
    // tags: 태그 · 분류(cat) · 유형 · 슬롯 아무거나 섞은 배열. 점수 높은 순 + seed로 섞음
    pick: function (tags, n, seed) {
      tags = Array.isArray(tags) ? tags : (tags ? [tags] : []);
      var type = null, slot = null; tags.forEach(function (t) { if (TYPES.indexOf(t) >= 0) type = t; if (SLOTS.indexOf(t) >= 0) slot = t; });
      return rank({ type: type, slot: slot, words: tags, cats: catsOf(tags) }, n || 1, seed == null ? tags.join(',') : seed);
    },
    // type: 기관 유형 7종 · scene: 템플릿 scene 키워드나 자유 문장(없으면 유형 기본 장면) · slot: hero|about|card|space|gallery
    // opts: { n, seed, exclude:[id], tone:'dark'|'light' } — n이 있으면 배열, 없으면 1장
    forScene: function (type, scene, slot, opts) {
      opts = opts || {};
      var cats = catsOf(scene);
      (TYPE_CATS[type] || []).forEach(function (c) { if (cats.indexOf(c) < 0) cats.push(c); });
      var out = rank({ type: type, slot: slot, cats: cats, words: [scene], exclude: opts.exclude, tone: opts.tone }, opts.n || 1, opts.seed == null ? [type, scene, slot].join('|') : opts.seed + '|' + slot);
      return opts.n ? out : (out[0] || null);
    },
    // 한 사이트에 쓸 사진 세트(슬롯마다 겹치지 않게). slots 예: ['hero','about','space','card','card','card']
    set: function (type, scene, slots, seed) {
      var used = [], res = {};
      (slots || SLOTS).forEach(function (sl, i) {
        var x = H.forScene(type, scene, sl, { seed: (seed || '') + i, exclude: used }); if (!x) return; used.push(x.id);
        if (res[sl]) { if (!Array.isArray(res[sl])) res[sl] = [res[sl]]; res[sl].push(x); } else res[sl] = x;
      });
      return res;
    },
    url: function (x, size) {
      if (typeof x === 'string') x = BY[x]; if (!x) return '';
      var p = size === 'sm' || size === 800 ? x.src800 : x.src;
      try { return new URL(p, BASE || location.href).href; } catch (e) { return p; }
    },
    // site.img[slot] 형식으로 변환(BRIEF 이미지 자리 규약). stock 필드로 샘플 여부를 남긴다
    slotImg: function (x, slot) {
      if (typeof x === 'string') x = BY[x]; if (!x) return null;
      return { src: slot === 'card' ? x.src800 : x.src, alt: x.alt, fit: 'cover', pos: x.focus, stock: x.id };
    },
    srcset: function (x) { if (typeof x === 'string') x = BY[x]; if (!x) return ''; return H.url(x, 'sm') + ' 800w, ' + H.url(x) + ' ' + Math.max(x.w, x.h) + 'w'; },
    isStock: function (v) { if (!v) return false; if (typeof v === 'object') return !!v.stock || H.isStock(v.src); return /(^|\/)img\/stock\/[a-z]{3}-\d{2}(-800)?\.webp/.test(String(v)); },
    // 사이트에 남아 있는 샘플 사진 수(site.img 슬롯 + banner.data.img + 섹션 data 안의 img/src)
    count: function (site) {
      if (!site) return 0; var n = 0, seen = {};
      function chk(v) { var s = v && typeof v === 'object' ? v.src : v; if (s && !seen[s] && H.isStock(v)) { seen[s] = 1; n++; } }
      try { Object.keys(site.img || {}).forEach(function (k) { chk(site.img[k]); }); } catch (e) {}
      try { (site.sections || site.secs || []).forEach(function (sec) { var d = sec && sec.data || {}; chk(d.img); chk(d.src); (d.items || d.photos || []).forEach(function (it) { chk(it && (it.img || it.src)); }); }); } catch (e) {}
      return n;
    },
    credit: function (x) { if (typeof x === 'string') x = BY[x]; return x ? x.credit : null; }
  };
  window.HPSTOCK = H;
})();
