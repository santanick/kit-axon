/* v43.5 외부 연결 카탈로그 — 대표님(2026-11-17) 「시안에서 실제 서비스로고를 모두 넣고 디자인은 10배 고도화해서 반영」 · 「기획개발 반영해서 끝까지 진행」
   시안: 디디쌤_외부연결_카탈로그_시안_v2.pdf(1쪽 카탈로그 · 2쪽 단계 연결 창 · 3쪽 휴대폰 · 4쪽 유형별 순서)
   - 새 연결 7종: 문자(SMS · LMS) · 카카오 알림톡 · 네이버페이 · 나이스페이먼츠 · 네이버 예약 · YouTube 채널 · Zoom
     상태 4단계: 미연결 · 진행 중(가맹 심사 · 템플릿 검수 · 파트너 협의) · 연결됨 · 점검 필요
   - 화면(slim.js 「연결」을 감싼다, 「자세히」는 기존 카드 화면 그대로):
     머리 카드(기관 유형 맞춤 추천 + 지표 3개와 7일 추세선) · 「기관 연결 / 학습자가 쓰는 연결」 · 하고 싶은 일로 찾기 · 분야 칩
     분야 묶음 카드(줄 = 공식 로고 · 이름 · 상태 배지 · 연결하면 할 수 있는 일 · +/✓) · 오른쪽 열(바로 켜지는 자동화 레시피 · 최근 실행 · 연결 부탁하기)
   - 줄을 누르면 기존 시트(sl-cn)가 열리고, 새 연결은 3단계 연결 창(준비 → 입력 → 시험) + 받는 사람이 보는 모습 미리보기
   - 비밀값(문자 API 키 · 알림톡 발신 프로필 키)은 기존 연결과 같이 이 브라우저 저장소(CNS)에만, 화면에는 가림. 결제 비밀 키는 화면에서 받지 않는다(서버 보관).
   - 개인정보: 학습자 연결 목록은 기관 유형별로 다르다(대학은 학번 · 학과 외 수집 없음 — 휴대폰 · SNS 연결 항목 없음).
   - 문자 · 알림톡: 수신 동의자에게만, 광고성은 (광고) 표기 · 수신거부 방법 · 야간(21~08시) 발송 금지. 알림톡은 2026-01-01부터 쿠폰 · 포인트 등 혜택성 안내 제한(광고는 브랜드 메시지).
   실제 외부 호출 지점은 '운영:' 주석. index.html에서 slim.js 다음. */
'use strict';
(() => {
  if (typeof VIEWS !== 'object' || typeof CN !== 'object' || typeof cnEnsure !== 'function' || typeof VIEWS.conn !== 'function') return;
  CN_ST.prog = '진행 중';
  const NEW = ['sms', 'alimtalk', 'naverpay', 'nicepay', 'nbook', 'youtube', 'zoom'];
  Object.assign(CN, {
    sms: { name: '문자 (SMS · LMS)', logo: 'SMS', col: '#3F3A33', use: '결석 · 미납 · 마감 안내, 알림톡이 실패하면 대신 보내기', guide: '',
      steps: ['발송사를 고릅니다. 기관이 계약한 문자 발송사가 있으면 그 API 키를, 없으면 디디쌤 기본 발송사(건당 요금)를 씁니다.', '발신번호를 사전 등록합니다. 전기통신사업법에 따라 등록된 번호로만 보낼 수 있습니다(발송사 관리 화면 › 발신번호 등록 · 통신서비스 이용증명원).', '발송사 관리 화면 › 개발자(API) 설정에서 API 키를 복사해 아래 칸에 붙여 넣습니다.', '[저장하고 시험]을 누르면 형식을 확인하고, 운영 서버가 담당자 번호로 시험 문자 1건을 보냅니다.'],
      alt: '광고성 문자는 맨 앞 (광고) 표기 · 수신거부 방법을 자동으로 붙이고, 밤 9시 ~ 아침 8시에는 보내지 않습니다. 수신 동의한 보호자 · 학습자에게만 보냅니다.' },
    alimtalk: { name: '카카오 알림톡', logo: 'K', col: '#FEE500', use: '수업 · 결제 · 수료 안내를 카카오톡으로', guide: '',
      steps: ['카카오톡 채널을 만들고 비즈니스 인증을 받습니다(카카오 비즈니스 › 채널 관리자센터).', '카카오 공식 딜러사와 계약해 발신 프로필 키(40자리)를 받습니다.', '보낼 안내문을 템플릿으로 등록합니다. 카카오 검수는 영업일 2~3일 걸리고, 승인된 문구만 보낼 수 있습니다.', '아래 칸에 딜러사 · 발신 프로필 키 · 검수 중인 템플릿 수를 넣고 [저장하고 시험]을 누릅니다.'],
      alt: '2026년 1월 1일부터 알림톡으로 쿠폰 · 마일리지 · 포인트 같은 혜택성 안내를 보낼 수 없습니다. 홍보는 브랜드 메시지(광고)로 보내고, 알림톡이 실패하면 문자로 대신 보냅니다.' },
    naverpay: { name: '네이버페이', logo: '페이', col: '#03A94D', use: '네이버 예약 · 플레이스로 온 학습자의 간편결제', guide: '',
      steps: ['네이버페이 센터에서 가맹 신청을 합니다(사업자등록증 · 정산 계좌 · 판매 상품 안내).', '네이버페이 심사가 끝나면 가맹점 ID가 발급됩니다. 결제 비밀 키는 디디쌤 서버에 보관하고 이 화면에서는 받지 않습니다.', '아래에 신청 상태와 가맹점 ID를 기록하면, 승인 뒤 결제 화면에 「네이버페이」 버튼이 붙습니다.'] },
    nicepay: { name: '나이스페이먼츠', logo: 'NICE', col: '#1F3A93', use: '기존 가맹 그대로 · 가상계좌 · 계좌이체', guide: '',
      steps: ['기관이 이미 쓰는 나이스페이먼츠 가맹이 있으면 그대로 연결합니다. 없으면 나이스페이먼츠 가맹 계약을 먼저 합니다.', '가맹점 관리자 › 상점 정보에서 상점 ID(MID)를 확인해 아래에 넣습니다. 결제 비밀 키는 디디쌤 서버에 보관합니다.', '[저장하고 시험]을 누르면 결제 수단(카드 · 가상계좌 · 계좌이체)이 매출 › 결제 설정에 나타납니다.'] },
    nbook: { name: '네이버 예약', logo: 'N', col: '#03C75A', use: '플레이스 예약을 디디쌤 체험 · 시설 예약과 맞추기', guide: '',
      steps: ['네이버 스마트플레이스에 업체를 등록하고 「예약」을 켭니다.', '네이버 예약 연동은 파트너 승인 뒤 열립니다. 지금은 플레이스 주소를 남겨 두면 연동이 열리는 대로 알려 드립니다.', '연동 뒤에는 예약 확정 · 취소가 디디쌤 예약표와 강사 캘린더에 자동으로 반영됩니다.'] },
    youtube: { name: 'YouTube 채널', logo: 'YT', col: '#FF0000', use: '강의 영상 비공개 업로드 · 재생목록을 강좌로 가져오기', guide: '',
      steps: ['기관 YouTube 채널을 운영하는 Google 계정을 준비합니다.', '가져올 채널 또는 재생목록 주소(youtube.com/…)를 붙여 넣습니다.', '[저장하고 시험]을 누르면 Google 동의 화면에서 YouTube 권한(읽기 · 업로드)을 허용합니다. 영상은 「일부 공개 · 비공개」 그대로 둡니다.'] },
    zoom: { name: 'Zoom', logo: 'Z', col: '#0B5CFF', use: '실시간 수업 링크 자동 생성 · 입장 기록으로 출석', guide: '',
      steps: ['Zoom App Marketplace에서 디디쌤 앱을 승인합니다(기관 Zoom 관리자 계정).', '수업을 열 Zoom 계정 이메일을 아래에 넣습니다.', '[저장하고 시험]을 누르면 시험 회의를 만들고 바로 지웁니다. 이후 실시간 수업마다 링크가 자동으로 생깁니다.'] }
  });
  NEW.forEach(id => { if (!CN_IDS.includes(id)) CN_IDS.push(id); });

  /* 상태: S.settings.conn[id] = { st, note, at, test, f:{공개값}, n:검수 중 템플릿 수 } */
  const cx = id => { const c = cnEnsure(); c[id] = Object.assign({ st: CN_ST.off, note: '', at: '', test: '', f: {} }, c[id] || {}); if (!c[id].f || typeof c[id].f !== 'object') c[id].f = {}; c.req = Array.isArray(c.req) ? c.req.slice(0, 40) : []; return c[id]; };
  const payOn = () => typeof mbPayOn !== 'function' || mbPayOn();
  const SEC = { sms: 'smsKey', alimtalk: 'atKey' };
  { const base = cnStatus; cnStatus = id => { if (!NEW.includes(id)) return base(id); const s = cx(id);
      if (SEC[id] && s.st !== CN_ST.off && s.f.vendor !== 'didi' && !CNS.get()[SEC[id]] && s.mode !== 'demo') return { st: CN_ST.chk, note: '이 브라우저에 키가 없습니다 — 다시 입력하세요' };
      return { st: s.st || CN_ST.off, note: s.note || ({ sms: '발신번호 · 발송사 미설정', alimtalk: '카카오톡 채널 · 발신 프로필 미설정', naverpay: '가맹 신청 전', nicepay: '상점 ID 없음', nbook: '플레이스 미등록', youtube: '채널 미연결', zoom: 'Zoom 계정 미연결' })[id] }; }; }
  const tone = st => st === CN_ST.on ? 'g' : st === CN_ST.chk ? 'y' : st === CN_ST.prog ? 'b' : '';
  const stLabel = (id, st) => st === CN_ST.prog ? ({ naverpay: '가맹 심사', nicepay: '가맹 계약', nbook: '협의 중', alimtalk: '템플릿 검수' })[id] || '진행 중' : st === CN_ST.off ? '' : st;

  /* 연결 창(3단계) — 새 연결 카드 */
  const RE = { tel: /^0\d{1,2}-?\d{3,4}-?\d{4}$/, smsKey: /^[\w-]{16,80}$/, atKey: /^[0-9a-fA-F]{40}$/, mid: /^[A-Za-z0-9]{6,20}$/, yt: /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\/\S+$/, mail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, place: /^https?:\/\/(naver\.me|(m\.)?place\.naver\.com|map\.naver\.com|smartplace\.naver\.com)\/\S*$/ };
  const telMask = v => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 9 ? `${d.slice(0, d.length - 8)}-○○○○-${d.slice(-4)}` : ''; };
  const step = id => { const s = cx(id); return s.st === CN_ST.on ? 3 : s.st === CN_ST.off ? 1 : 2; };
  function prev(id) { const o = esc((S.org && S.org.name) || '우리 기관');
    if (id === 'sms') return `<div class="cx-prev"><small>받는 사람이 보는 모습</small><p class="cx-bub">[${o}] 김○○ 학생이 오늘 수업에 결석했어요. 보강 일정은 앱에서 확인해 주세요.</p><p class="cx-bub">[${o}] 이번 달 수강료 납부일이 3일 남았어요. 결제 링크: didi.sm/p/○○</p></div>`;
    if (id === 'alimtalk') return `<div class="cx-prev kk"><small>카카오톡으로 받는 모습</small><p class="cx-bub"><b>알림톡 도착</b>${o} 수업 안내<br>내일 19:00 수업이 있어요. 준비물: 교재 3단원</p></div>`;
    return ''; }
  function card(id) { const d = CN[id]; const s = cx(id); const st = cnStatus(id); const sec = CNS.get(); const n = step(id);
    const pw = (k, ph, has) => `<input type="password" id="cx-${id}-${k}" autocomplete="off" spellcheck="false" placeholder="${esc(has ? '저장됨 — 바꾸려면 새 값 입력' : ph)}">`;
    const tx = (k, ph, v, t = 'text', mx = 120) => `<input type="${t}" id="cx-${id}-${k}" maxlength="${mx}" placeholder="${esc(ph)}" value="${esc(v || '')}">`;
    let f = '';
    if (id === 'sms') f = `<div class="fl"><span>발송사</span><div class="cx-ch" role="radiogroup" aria-label="발송사">${[['own', '기관이 계약한 발송사'], ['didi', '디디쌤 기본 발송사(건당 요금)']].map(([k, l]) => `<label><input type="radio" name="cx-sms-vendor" value="${k}" ${(s.f.vendor || 'own') === k ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
      <label class="fl">발신번호(사전 등록한 번호)${tx('tel', '051-000-0000', s.f.tel ? telMask(s.f.tel) : '', 'tel', 14)}</label><label class="fl">발송사 API 키${pw('key', '발송사 관리 화면 › API 설정에서 복사', sec.smsKey)}</label>`;
    if (id === 'alimtalk') f = `<div class="form2 cn-f2"><label class="fl">공식 딜러사${tx('dealer', '예: ○○ 딜러사', s.f.dealer, 'text', 40)}</label><label class="fl">검수 중인 템플릿 수${tx('n', '0', String(s.n || 0), 'number', 3)}</label></div><label class="fl">발신 프로필 키(40자리)${pw('key', '딜러사에서 받은 발신 프로필 키', sec.atKey)}</label>`;
    if (id === 'naverpay') f = `<div class="form2 cn-f2"><label class="fl">신청 상태<select id="cx-naverpay-ps">${['신청 전', '신청함', '심사 중', '승인'].map(x => `<option ${(s.f.ps || '신청 전') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="fl">가맹점 ID(승인 후)${tx('mid', '네이버페이 가맹점 ID', s.f.mid ? cnMask(s.f.mid) : '', 'text', 20)}</label></div>`;
    if (id === 'nicepay') f = `<div class="form2 cn-f2"><label class="fl">계약 상태<select id="cx-nicepay-ps">${['계약 전', '계약 진행', '사용 중'].map(x => `<option ${(s.f.ps || '계약 전') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="fl">상점 ID(MID)${tx('mid', '예: nicepay00m', s.f.mid ? cnMask(s.f.mid) : '', 'text', 20)}</label></div>`;
    if (id === 'nbook') f = `<label class="fl">스마트플레이스 · 네이버 지도 주소${tx('url', 'https://naver.me/…', s.f.url, 'url', 200)}</label>`;
    if (id === 'youtube') f = `<label class="fl">채널 · 재생목록 주소${tx('url', 'https://www.youtube.com/@기관채널', s.f.url, 'url', 200)}</label>`;
    if (id === 'zoom') f = `<label class="fl">Zoom 계정 이메일${tx('mail', 'zoom@기관.kr', s.f.mail ? s.f.mail.replace(/^(.{2}).*(@.*)$/, '$1••••$2') : '', 'email', 80)}</label>`;
    const stp = ['준비하기', id === 'sms' ? '발신번호 · 키' : id === 'alimtalk' ? '발신 프로필' : ['naverpay', 'nicepay'].includes(id) ? '가맹 정보' : '계정 · 주소', id === 'nbook' ? '연동 알림' : '시험 · 완료'];
    return `<div class="card cn-card cx-card" id="cnCard-${id}" data-st="${esc(st.st)}"><div class="cn-h">${typeof brandLogo === 'function' ? brandLogo(id, 44, d.name) : ''}<div><b>${esc(d.name)}</b><small>${esc(d.use)}</small></div>${tag(stLabel(id, st.st) || '미연결', tone(st.st))}</div>
      <ol class="cx-steps" aria-label="연결 단계">${stp.map((t, i) => `<li class="${i + 1 < n ? 'done' : i + 1 === n ? 'cur' : ''}"><i>${i + 1 < n ? '✓' : i + 1}</i>${esc(t)}</li>`).join('')}</ol>
      <p class="cn-note">${esc(st.note)}</p>${cnGuideHTML(id, st.st !== CN_ST.on)}<div class="cn-body">${f}</div>${prev(id)}
      <div class="bar2 cn-acts"><button class="btn ink sm" data-act="cnx-save" data-v="${id}">${ic('check', 14)} ${id === 'nbook' ? '주소 남기고 알림 받기' : '저장하고 시험'}</button>${['sms', 'alimtalk', 'youtube', 'zoom'].includes(id) && st.st === CN_ST.off ? `<button class="btn sm" data-act="cnx-demo" data-v="${id}">데모로 연결</button>` : ''}${id === 'alimtalk' && st.st === CN_ST.prog ? `<button class="btn sm" data-act="cnx-demo" data-v="${id}">검수 완료로 표시</button>` : ''}${st.st !== CN_ST.off ? `<button class="btn sm ghost" data-act="cn-off" data-v="${id}">연결 해제</button>` : ''}</div>${s.test ? `<p class="mini cn-last">최근 확인: ${esc(s.test)}</p>` : ''}</div>`; }
  { const base = cnCard; cnCard = id => NEW.includes(id) ? card(id) : base(id); }
  const val = (id, k) => { const el = document.getElementById(`cx-${id}-${k}`); return el ? String(el.value || '').trim() : ''; };
  function done(id, st, note, test) { const s = cx(id); Object.assign(s, { st, note, test: `${nowStr()} · ${test}`, at: s.at || today() }); cnLog(id, test, st !== CN_ST.chk); logAudit(`외부 연결 — ${CN[id].name} ${test}`); save(); render(); if (typeof cnSig === 'function') cnSig('cn_' + id); }
  function saveX(id) { const s = cx(id); const sec = CNS.get(); const bad = (m, k) => { toast(m, 'warn'); const el = k && document.getElementById(`cx-${id}-${k}`); if (el) el.focus(); return false; };
    if (id === 'sms') { const vd = (document.querySelector('[name=cx-sms-vendor]:checked') || {}).value || 'own'; const tel = val(id, 'tel'), key = val(id, 'key');
      if (tel && !tel.includes('○')) { if (!RE.tel.test(tel)) return bad('발신번호 형식을 확인하세요. 예: 051-123-4567', 'tel'); s.f.tel = tel.replace(/\D/g, ''); }
      if (!s.f.tel) return bad('사전 등록한 발신번호를 넣으세요.', 'tel');
      if (vd === 'own') { if (key) { if (!RE.smsKey.test(key)) return bad('발송사 API 키 형식을 확인하세요(영문 · 숫자 16자 이상).', 'key'); CNS.set({ smsKey: key }); } if (!CNS.get().smsKey) return bad('기관 발송사의 API 키를 넣으세요. 없으면 「디디쌤 기본 발송사」를 고르세요.', 'key'); }
      s.f.vendor = vd; s.mode = '';
      /* 운영: POST /api/notify/test { ch:'sms' } — 서버가 발송사 API로 담당자 번호에 시험 문자 1건(발송 · 실패 기록) */
      return done(id, CN_ST.on, `${vd === 'didi' ? '디디쌤 기본 발송사' : '기관 발송사'} · 발신 ${telMask(s.f.tel)}`, '발신번호 · 키 형식 확인 — 시험 문자는 운영 서버가 보냅니다'); }
    if (id === 'alimtalk') { const key = val(id, 'key'), dealer = val(id, 'dealer'); const n = Math.max(0, Math.min(99, parseInt(val(id, 'n'), 10) || 0));
      if (key) { if (!RE.atKey.test(key)) return bad('발신 프로필 키는 40자리(영문 · 숫자)입니다.', 'key'); CNS.set({ atKey: key }); }
      if (!CNS.get().atKey) return bad('딜러사에서 받은 발신 프로필 키를 넣으세요.', 'key');
      Object.assign(s.f, { dealer: dealer.slice(0, 40) }); s.n = n; s.mode = '';
      return n ? done(id, CN_ST.prog, `템플릿 검수 중 ${n}개${dealer ? ` · ${dealer}` : ''}`, `발신 프로필 저장 · 템플릿 검수 대기 ${n}개`) : done(id, CN_ST.on, `발신 프로필 ${cnMask(CNS.get().atKey)}${dealer ? ` · ${dealer}` : ''}`, '발신 프로필 형식 확인 — 시험 발송은 운영 서버가 합니다'); }
    if (id === 'naverpay' || id === 'nicepay') { const ps = val(id, 'ps'), mid = val(id, 'mid'); if (mid && !mid.includes('•')) { if (!RE.mid.test(mid)) return bad('가맹점(상점) ID 형식을 확인하세요(영문 · 숫자 6~20자).', 'mid'); s.f.mid = mid; }
      s.f.ps = ps; const okk = ps === '승인' || ps === '사용 중';
      if (okk && !s.f.mid) return bad('승인된 가맹점(상점) ID를 넣으세요.', 'mid');
      if (ps === '신청 전' || ps === '계약 전') return done(id, CN_ST.off, '', `상태 기록 — ${ps}`);
      /* 운영: 결제 비밀 키는 서버 환경 변수 · 비밀 관리자에 두고, 결제 수단 목록(/api/pay/methods)에 자동 반영 */
      return done(id, okk ? CN_ST.on : CN_ST.prog, okk ? `${id === 'naverpay' ? '가맹점' : '상점'} ID ${cnMask(s.f.mid)} · 결제 화면에 표시` : `${ps} — 승인되면 결제 화면에 자동 표시`, `가맹 상태 기록 — ${ps}`); }
    if (id === 'nbook') { const u = val(id, 'url'); if (!RE.place.test(u)) return bad('네이버 플레이스 · 지도 주소(naver.me · place.naver.com)를 넣으세요.', 'url'); s.f.url = u.slice(0, 200);
      return done(id, CN_ST.prog, '파트너 협의 중 — 연동이 열리면 알려 드립니다', '플레이스 주소 등록 · 연동 대기'); }
    if (id === 'youtube') { const u = val(id, 'url'); if (!RE.yt.test(u)) return bad('YouTube 채널 · 재생목록 주소(youtube.com/…)를 넣으세요.', 'url'); s.f.url = u.slice(0, 200); s.mode = '';
      /* 운영: Google OAuth(youtube.readonly · youtube.upload) — 서버가 refresh token 암호화 보관, playlistItems.list로 강좌 가져오기 */
      return done(id, CN_ST.on, '채널 연결(데모) · 재생목록을 강좌로 가져올 수 있습니다', '채널 주소 확인 · 권한 허용(데모)'); }
    if (id === 'zoom') { const m = val(id, 'mail'); if (m && !m.includes('•')) { if (!RE.mail.test(m)) return bad('Zoom 계정 이메일을 확인하세요.', 'mail'); s.f.mail = m; } if (!s.f.mail) return bad('Zoom 계정 이메일을 넣으세요.', 'mail'); s.mode = '';
      /* 운영: Zoom OAuth 앱 승인 → POST https://api.zoom.us/v2/users/me/meetings(시험 회의) → DELETE */
      return done(id, CN_ST.on, `${s.f.mail.replace(/^(.{2}).*(@.*)$/, '$1••••$2')} · 수업 링크 자동 생성`, '계정 확인 · 시험 회의 생성 · 삭제(데모)'); }
  }
  function demoX(id) { const s = cx(id); if (id === 'alimtalk' && s.st === CN_ST.prog) { s.n = 0; return done(id, CN_ST.on, `발신 프로필${s.f.dealer ? ` · ${s.f.dealer}` : ''} · 템플릿 승인`, '템플릿 검수 완료 표시'); }
    s.mode = 'demo'; if (id === 'sms') s.f = Object.assign({ tel: '0510000000', vendor: 'didi' }, s.f);
    done(id, CN_ST.on, '데모 연결(실제 발송 없음) — 자동화 실행 시 기록만 남깁니다', '데모 연결'); toast(`${CN[id].name}을(를) 데모로 연결했습니다.`, 'ok'); }
  ACT['cnx-save'] = el => saveX(el.dataset.v);
  ACT['cnx-demo'] = el => demoX(el.dataset.v);
  { const b = ACT['cn-test']; ACT['cn-test'] = el => NEW.includes(el.dataset.v) ? saveX(el.dataset.v) : b(el); }
  { const base = cnOff; cnOff = id => { if (!NEW.includes(id)) return base(id); const nm = CN[id].name;
      modal(`${nm} 연결 해제`, `<p>${esc(nm)} 연결을 해제합니다. 이 연결을 쓰는 자동화 단계는 「연결 필요」로 표시되고 실행 시 건너뜁니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '연결 해제', kind: 'red', run: () => {
        if (SEC[id]) CNS.del(SEC[id]); const c = cnEnsure(); c[id] = { st: CN_ST.off, note: '', at: '', test: '', f: {} }; cnLog(id, '연결 해제', true); logAudit(`외부 연결 해제 — ${nm}`); save(); render(); toast(`${nm} 연결을 해제했습니다.`); } }]); }; }

  /* 자동화: 알림톡 · 문자 단계와 레시피 3종 */
  Object.assign(ACTION, { alimtalk: '카카오 알림톡 보내기', sms: '문자 보내기(알림톡 실패 시 대체)' });
  Object.assign(CN_ACT, { alimtalk: ['alimtalk', '', '카카오 알림톡'], sms: ['sms', '', '문자'] });
  [{ k: 'absent-alim', n: '결석 → 보호자 알림톡 + 실패 시 문자', tr: 'ev:absent', cond: '결석 처리', acts: ['alimtalk', 'sms', 'parent'], ap: false, d: '출결에서 결석을 저장하면 보호자에게 알림톡을 보내고, 받지 못한 사람에게만 문자로 다시 보냅니다.' },
    { k: 'unpaid-3', n: '미납 3단계 안내 → 문자 + 할 일', tr: 'sc:daily', cond: '납부일 D-3 · D+1 · D+7', acts: ['sms', 'task'], ap: true, d: '납부일 3일 전 · 다음 날 · 7일 뒤에 결제 링크를 문자로 보내고, 7일이 지나면 담당자 할 일을 만듭니다.' },
    { k: 'trial-cal', n: '체험 예약 → 강사 캘린더 + 확인 알림톡', tr: 'ev:consultNew', cond: '체험 · 상담 예약 확정', acts: ['gcal', 'alimtalk'], ap: false, d: '예약이 확정되면 강사 캘린더에 일정을 잡고 예약자에게 확인 알림톡을 보냅니다.' }
  ].forEach(T => { if (!CN_TPL.some(x => x.k === T.k)) CN_TPL.push(T); });
  { const base = cnExec; cnExec = (a, T) => base(a, T).map(s => { if (s.ok && !s.msg && s.act === 'alimtalk') s.msg = `알림톡 ${Math.max(1, T.length)}건 발송 요청 · ${cx('alimtalk').mode === 'demo' ? '데모' : '운영 서버 큐'}`; if (s.ok && !s.msg && s.act === 'sms') s.msg = '알림톡 실패분만 문자로 대체 · 0건(데모)'; return s; }); }
  { const base = targets; targets = a => { const k = String((a && a.key) || ''); if (k === 'cn-absent-alim') { try { return (S.attend || []).filter(x => x.st === '결석').slice(0, 20).map(x => x.id); } catch (e) { return []; } } if (k === 'cn-unpaid-3') { try { return (S.pays || []).filter(p => /미납|대기/.test(p.status || '')).map(p => p.id); } catch (e) { return []; } } if (k === 'cn-trial-cal') { try { return (S.consults || []).slice(0, 3).map(x => x.id); } catch (e) { return []; } } return base(a); }; }

  /* 분야 · 기관 유형별 순서 */
  const CAT = { msg: ['메시지', '보호자 · 학습자에게 알리기', ['sms', 'alimtalk', 'slack', 'channeltalk']], pay: ['결제', '온라인 · 간편결제 · 정산', ['toss', 'naverpay', 'nicepay']], cal: ['일정 · 예약', '상담 · 수업 · 시설', ['google', 'nbook', 'zoom']], media: ['영상 · 문서', '강의 영상 · 기록', ['youtube']], ai: ['AI', 'AI SAM · 외부 AI', ['claude', 'mcp']] };
  const TY = () => (S.org && S.org.type) || 'adult';
  const PRI = { adult: ['sms', 'alimtalk', 'toss', 'naverpay', 'nbook'], k12: ['alimtalk', 'sms', 'toss', 'naverpay', 'nbook'], univ: ['google', 'zoom', 'youtube', 'mcp'], univ_lms: ['google', 'zoom', 'youtube', 'mcp'], corp: ['slack', 'google', 'zoom'], public: ['nbook', 'naverpay', 'sms', 'toss'], lifelong: ['alimtalk', 'sms', 'nicepay', 'toss'], voc: ['alimtalk', 'sms', 'nicepay', 'zoom'] };
  const CORD = { univ: ['cal', 'media', 'ai', 'msg', 'pay'], univ_lms: ['cal', 'media', 'ai', 'msg', 'pay'], corp: ['msg', 'cal', 'ai', 'media', 'pay'] };
  const pri = () => PRI[TY()] || PRI.adult;
  const ids = () => (typeof cnIds === 'function' ? cnIds() : CN_IDS).filter(id => CN[id] && (!['naverpay', 'nicepay'].includes(id) || payOn()));
  const rank = id => { const i = pri().indexOf(id); return i < 0 ? 99 : i; };
  const recs = () => pri().filter(id => ids().includes(id) && cnStatus(id).st === CN_ST.off).slice(0, 2);
  const nm = id => CN[id].name.replace(/\s*\(.*\)/, '');

  /* 학습자가 쓰는 연결(기관 유형별) — 학습자 앱 「나 › 앱 및 서비스 연결」과 같은 목록 */
  const LRN = () => { const t = TY(), U = /^univ/.test(t), PH = ['public', 'lifelong'].includes(t);
    return [['알림 · 일정', [['gcal', '내 캘린더(Google)', '수업 · 마감이 내 캘린더에', true], ['apple', '캘린더 파일(Apple · Outlook)', '.ics 파일로 내 캘린더에 넣기', true], ['kakao', '카카오톡 알림', '수업 · 결제 안내를 카카오톡으로', !U], ['sms', '문자 알림', '시설 예약 · 강습 알림(동의 시에만 번호 수집)', PH]]],
      ['로그인 · 결제', [['naver', '간편 로그인(카카오 · 네이버 · Google)', '다음부터 한 번에 들어오기', !U], ['naverpay', '간편결제', '수강료를 간편결제로', !U && payOn()]]],
      ['영상 · 기록', [['youtube', 'YouTube 이어 보기', '기관 채널 강의를 앱에서 이어 보기', true]]]]; };

  /* 7일 실행 추세 */
  const days7 = () => { const out = []; for (let i = 6; i >= 0; i--) { const d = addDays(today(), -i); out.push((S.runs || []).filter(r => String(r.at || '').slice(0, 10) === d || String(r.date || '') === d).length); } return out; };
  const spark = (a, w = 96, h = 22) => { const m = Math.max(1, ...a); const p = a.map((v, i) => `${Math.round(i * w / (a.length - 1))},${Math.round(h - 2 - v / m * (h - 4))}`).join(' '); return `<svg class="cx-sp" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${p}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`; };

  const row = id => { const s = cnStatus(id); const on = s.st === CN_ST.on; const lb = stLabel(id, s.st);
    return `<button type="button" class="cx-row" data-act="sl-cn" data-v="${esc(id)}" data-q="${esc((CN[id].name + ' ' + CN[id].use).toLowerCase())}">${typeof brandLogo === 'function' ? brandLogo(id, 44, CN[id].name) : ''}<span class="cx-tx"><b>${esc(nm(id))}${lb ? ` ${tag(lb, tone(s.st))}` : ''}</b><small>${esc(CN[id].use)}</small></span><span class="cx-go ${on ? 'on' : ''}" aria-hidden="true">${on ? '✓' : '+'}</span><span class="sr">${esc(on ? '연결됨 — 관리' : '연결하기')}</span></button>`; };
  const grp = (k, list, all) => { const [t, sub] = CAT[k]; const L = list.slice().sort((a, b) => rank(a) - rank(b)); return L.length ? `<section class="cx-grp" data-cat="${k}"><div class="cx-gh"><b>${t}</b><small>${sub}</small><span class="cx-gn">${L.filter(id => cnStatus(id).st === CN_ST.on).length}/${L.length}</span></div>${(all ? L : L.slice(0, 3)).map(row).join('')}${!all && L.length > 3 ? `<button type="button" class="cx-more" data-act="cnx-cat" data-v="${k}">${t} ${L.length - 3}개 더 보기 ›</button>` : ''}</section>` : ''; };

  function recipeHTML() { const keys = /^univ/.test(TY()) ? ['consult-cal', 'question-slack', 'done-cert'] : TY() === 'corp' ? ['join-notify', 'weekly-report', 'done-cert'] : ['absent-alim', 'unpaid-3', 'trial-cal'];
    return keys.map(k => CN_TPL.find(x => x.k === k)).filter(Boolean).map(T => { const miss = cnNeeds(T.acts); const have = S.autos.some(a => a.key === 'cn-' + T.k);
      return `<div class="cx-rc"><b>${esc(T.n.split(' → ')[0])} <small>→ ${esc(T.n.split(' → ').slice(1).join(' → '))}</small></b><div class="cx-flow"><span class="nd t">${esc(trigLabel(T.tr).replace(/ 시$/, ''))}</span>${T.acts.map(a => `<span class="cx-nw"><i aria-hidden="true">→</i><span class="nd ${cnNeed(a) ? 'miss' : ''} ${a === 'sms' && T.acts.includes('alimtalk') ? 'f' : ''}">${esc(a === 'sms' && T.acts.includes('alimtalk') ? '실패 시 문자' : (ACTION[a] || a).replace(/ (보내기|만들기|추가|알림)$/, '').replace('(알림톡 실패 시 대체)', ''))}</span></span>`).join('')}</div>
        <div class="cx-rf">${have ? tag('켜 둠', 'g') : miss.length ? `<span class="mini">연결 필요: ${esc(miss.join(' · '))}</span>` : `<span class="mini">바로 켤 수 있습니다</span>`}<button class="btn sm ${miss.length || have ? '' : 'ink'}" data-act="cn-tpl" data-v="${T.k}">${have ? '하나 더' : miss.length ? '꺼진 채 만들기' : '켜기'}</button></div></div>`; }).join(''); }
  function runsHTML() { const R = (S.runs || []).filter(r => r.steps).slice(0, 4); const L = (cnEnsure().log || []).slice(0, 4 - R.length);
    const li = [...R.map(r => [r.st === '완료' ? 'ok' : 'y', `${r.name}`, r.at]), ...L.map(x => [x.ok ? 'ok' : 'y', `${(CN[x.svc] || {}).name || x.svc} — ${x.msg}`, x.at])];
    return li.length ? `<ul class="cx-runs">${li.map(([t, m, at]) => `<li class="${t}"><i aria-hidden="true"></i><span>${esc(m)}</span><time>${esc(String(at || '').split(' ').slice(0, 3).join(' '))}</time></li>`).join('')}</ul>` : `<p class="mini">연결하면 실행 기록이 여기에 쌓입니다.</p>`; }

  const old = VIEWS.conn;
  VIEWS.conn = () => { if (UI.slConnOld || typeof SL !== 'object') return old();
    cnEnsure(); const I = ids(); const on = I.filter(id => cnStatus(id).st === CN_ST.on), chk = I.filter(id => cnStatus(id).st === CN_ST.chk);
    const seg = UI.cxSeg === 'lrn' ? 'lrn' : 'org'; const cat = UI.cxCat || 'all'; const R = recs(); const D = days7(); const wk = D.reduce((a, b) => a + b, 0);
    const P = S.autos.filter(a => (a.actions || []).some(x => CN_ACT[x])); const needN = P.filter(a => cnNeeds(a.actions).length).length;
    const hero = `<section class="cx-hero"><div class="cx-hl"><p class="cx-ey"><i aria-hidden="true"></i>${on.length ? `지금 ${on.length}개 앱이 일하고 있습니다` : '아직 연결된 앱이 없습니다'}</p>
      <h2>${R.length ? `${R.map(nm).join(' · ')} 연결로<br>${/^univ/.test(TY()) ? '수업 일정 · 영상이 한 번에 이어집니다' : TY() === 'corp' ? '교육 알림 · 보고가 자동으로 돕니다' : '안내 · 결제가 끝까지 자동입니다'}` : '추천 연결을 모두 마쳤습니다<br>자동화 레시피를 켜 보세요'}</h2>
      <p>${esc(((typeof TYPES === 'object' && TYPES[TY()]) || {}).name || '우리')} 기관에 맞춘 추천입니다. 연결은 기관 계정으로 한 번만 하고, 키 · 토큰은 가려서 보관합니다.</p>
      <div class="cx-ha">${R.length ? `<button class="btn cx-w" data-act="sl-cn" data-v="${R[0]}">${esc(nm(R[0]))} 연결하기</button>` : `<button class="btn cx-w" data-act="go" data-v="auto">자동화 보기</button>`}<button class="btn cx-gh" data-act="cnx-check">연결 상태 점검${chk.length ? ` · ${chk.length}` : ''}</button></div></div>
      <div class="cx-kp">${[[on.length, '연결된 앱', on.length ? D.map((_, i) => Math.min(on.length, i + 1)) : D], [wk, '이번 주 자동 실행', D], [needN, '연결이 필요한 자동화', D.map(() => needN)]].map(([v, l, a]) => `<div class="cx-k"><b>${v}</b><span>${l}</span>${spark(a)}</div>`).join('')}</div></section>`;
    const tools = `<div class="cx-tools"><div class="cx-seg" role="tablist" aria-label="연결 구분">${[['org', '기관 연결', I.length], ['lrn', '학습자가 쓰는 연결', LRN().reduce((n, g) => n + g[1].filter(x => x[3]).length, 0)]].map(([k, l, n]) => `<button type="button" role="tab" aria-selected="${seg === k}" class="${seg === k ? 'on' : ''}" data-act="cnx-seg" data-v="${k}">${l} <em>${n}</em></button>`).join('')}</div>${seg === 'org' ? `<label class="cx-q">${ic('search' in IC ? 'search' : 'spark', 16)}<input id="cxQ" type="text" inputmode="search" enterkeyhint="search" maxlength="40" placeholder="서비스 · 하고 싶은 일 찾기 (예: 결석 알림)" aria-label="연결 찾기" value="${esc(UI.cxQ || '')}"></label>` : ''}</div>`;
    const cats = Object.keys(CAT).filter(k => CAT[k][2].some(id => I.includes(id)));
    const chips = seg === 'org' ? `<div class="cx-cats">${[['all', '전체', I.length], ...cats.map(k => [k, CAT[k][0], CAT[k][2].filter(id => I.includes(id)).length])].map(([k, l, n]) => `<button type="button" class="cx-cat ${cat === k ? 'on' : ''}" data-act="cnx-cat" data-v="${k}" aria-pressed="${cat === k}">${l} <em>${n}</em></button>`).join('')}</div>` : '';
    const order = (CORD[TY()] || ['msg', 'pay', 'cal', 'media', 'ai']).filter(k => cats.includes(k));
    const main = seg === 'org' ? `<div class="cx-grps ${cat !== 'all' ? 'one' : ''}">${(cat === 'all' ? order : [cat]).map(k => grp(k, CAT[k][2].filter(id => I.includes(id)), cat !== 'all')).join('')}</div><p class="cx-none mini" hidden>찾는 연결이 없습니다. 오른쪽 「연결 부탁하기」로 알려 주세요.</p>`
      : `<p class="mini cx-lnote">${/^univ/.test(TY()) ? '대학은 학번 · 학과 외 정보를 받지 않으므로 휴대폰 · SNS 연결은 보이지 않습니다. 학습자는 앱 「나 › 앱 및 서비스 연결」에서 직접 켜고 끕니다(기본 꺼짐).' : '학습자는 앱 「나 › 앱 및 서비스 연결」에서 직접 켜고 끕니다. 기본은 모두 꺼짐이고, 켤 때 목적 · 보관 기간을 보여 주고 동의를 남깁니다.'}</p><div class="cx-grps">${LRN().map(([t, L]) => `<section class="cx-grp"><div class="cx-gh"><b>${t}</b></div>${L.map(([b, n, u, ok]) => `<div class="cx-row cx-lr ${ok ? '' : 'off'}">${typeof brandLogo === 'function' ? brandLogo(b, 44, n) : ''}<span class="cx-tx"><b>${esc(n)}</b><small>${esc(u)}</small></span>${tag(ok ? '학습자에게 보임' : '이 기관 유형은 숨김', ok ? 'g' : '')}</div>`).join('')}</section>`).join('')}</div>`;
    const side = `<aside class="cx-side"><div class="card cx-sc"><div class="cx-sh"><b>연결하면 바로 켜지는 자동화</b><button class="btn sm ghost" data-act="go" data-v="auto">전체</button></div>${recipeHTML()}</div>
      <div class="card cx-sc"><div class="cx-sh"><b>최근 실행</b></div>${runsHTML()}</div>
      <div class="cx-req"><b>찾는 서비스가 없으신가요?</b><p>지금 쓰는 프로그램을 알려 주시면 다음 연결 순서에 반영합니다.${(cnEnsure().req || []).length ? ` 이 기관 요청 ${cnEnsure().req.length}건.` : ''}</p><button class="btn sm" data-act="cnx-req">연결 부탁하기 ›</button></div></aside>`;
    /* 페이지 머리(탭 제목)가 이미 「외부 연결」이므로 제목을 한 번 더 쓰지 않고, 브리핑 카드 대신 이 화면의 머리 카드(hero)를 쓴다 */
    if (!REG1 && window.L43 && typeof L43.reg === 'function') { REG1 = true; L43.reg('conn', { art: 'gear', brief: () => null }); }
    return `<div class="sl-page cx">${hero}${tools.replace('</div>' + (seg === 'org' ? '' : ''), '</div>')}${chips}<div class="cx-wrap"><div class="cx-main">${main}</div>${side}</div><div class="cx-foot"><button class="btn ai sm" data-act="chat-q" data-v="외부 서비스 연결 도와줘">${ic('spark', 14)} AI SAM에게 연결 맡기기</button><button class="btn sm" data-act="sl-connold" data-v="1">연결 카드 자세히 보기</button><span class="mini">${ic('lock' in IC ? 'lock' : 'gear', 13)} 키 · 토큰은 대화창에 붙여 넣지 마세요. 연결 창의 입력 칸에서만 받고 가려서 보관합니다.</span></div></div>`; };
  let REG1 = false;

  ACT['cnx-seg'] = el => { UI.cxSeg = el.dataset.v; render(); };
  ACT['cnx-cat'] = el => { UI.cxCat = el.dataset.v; UI.cxSeg = 'org'; render(); };
  ACT['cnx-check'] = () => { const I = ids(); const chk = I.filter(id => cnStatus(id).st === CN_ST.chk), pr = I.filter(id => cnStatus(id).st === CN_ST.prog);
    toast(chk.length ? `점검이 필요한 연결: ${chk.map(nm).join(' · ')}` : `연결 ${I.filter(id => cnStatus(id).st === CN_ST.on).length}개 정상${pr.length ? ` · 진행 중 ${pr.map(nm).join(' · ')}` : ''}`, chk.length ? 'warn' : 'ok'); if (chk.length) ACT['sl-cn']({ dataset: { v: chk[0] } }); };
  ACT['cnx-req'] = () => modal('연결 부탁하기', `<label class="fl">어떤 서비스인가요?<input name="s" maxlength="40" placeholder="예: 네이버 밴드, 클래스101, 더존"></label><label class="fl">연결하면 하고 싶은 일<input name="w" maxlength="100" placeholder="예: 수강 신청을 밴드 공지로 자동 게시"></label><p class="mini">요청은 기관 이름과 함께 디디쌤 연결 우선순위에 반영됩니다. 개인정보는 적지 마세요.</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '보내기', kind: 'pri', run: w => { const s = fv(w, 's'); if (!s) { toast('서비스 이름을 적어 주세요.', 'warn'); return false; } const c = cnEnsure(); c.req = [{ s: s.slice(0, 40), w: fv(w, 'w').slice(0, 100), at: nowStr() }, ...(c.req || [])].slice(0, 40);
      /* 운영: POST /api/feedback { kind:'conn_req' } */ logAudit(`연결 요청 — ${s}`); save(); render(); toast('연결 요청을 남겼습니다. 감사합니다.', 'ok'); } }]);
  /* 찾기: 다시 그리지 않고 줄만 거른다 */
  document.addEventListener('input', e => { const t = e.target; if (!t || t.id !== 'cxQ') return; UI.cxQ = t.value; const q = t.value.trim().toLowerCase(); let n = 0;
    document.querySelectorAll('.cx-grp').forEach(g => { let k = 0; g.querySelectorAll('.cx-row[data-q]').forEach(r => { const hit = !q || r.dataset.q.includes(q) || (q.includes('결석') && /알림톡|문자/.test(r.dataset.q)) || (q.includes('결제') && /결제|페이/.test(r.dataset.q)); r.hidden = !hit; if (hit) k++; }); g.hidden = !k; n += k; const m = g.querySelector('.cx-more'); if (m) m.hidden = !!q; });
    const none = document.querySelector('.cx-none'); if (none) none.hidden = !!n; });
  /* 줄 묶음은 카테고리 「전체」에서 3개만 — 찾을 때는 숨은 줄도 보여야 하므로 전체 목록을 쓴다 */
  AFTER.push(cur => { if (!cur || cur.tab !== 'conn' || !UI.cxQ) return; const i = document.getElementById('cxQ'); if (i) i.dispatchEvent(new Event('input', { bubbles: true })); });
})();
