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
  const CAT = { msg: ['메시지', '보호자 · 학습자에게 알리기', ['sms', 'alimtalk', 'slack', 'teams', 'channeltalk']], pay: ['결제', '온라인 · 간편결제 · 정산', ['toss', 'naverpay', 'nicepay']], cal: ['일정 · 예약', '상담 · 수업 · 시설', ['google', 'nbook', 'zoom', 'teams']], media: ['영상 · 문서', '강의 영상 · 기록', ['youtube']], ai: ['AI', 'AI SAM · 외부 AI', ['claude', 'mcp']] };
  const TY = () => (S.org && S.org.type) || 'adult';
  const PRI = { adult: ['sms', 'alimtalk', 'toss', 'naverpay', 'nbook'], k12: ['alimtalk', 'sms', 'toss', 'naverpay', 'nbook'], univ: ['google', 'teams', 'zoom', 'youtube', 'mcp'], univ_lms: ['google', 'teams', 'zoom', 'youtube', 'mcp'], corp: ['slack', 'teams', 'google', 'zoom'], public: ['nbook', 'naverpay', 'sms', 'toss', 'teams'], lifelong: ['alimtalk', 'sms', 'nicepay', 'toss'], voc: ['alimtalk', 'sms', 'nicepay', 'zoom'] };
  const CORD = { univ: ['cal', 'media', 'ai', 'msg', 'pay'], univ_lms: ['cal', 'media', 'ai', 'msg', 'pay'], corp: ['msg', 'cal', 'ai', 'media', 'pay'] };
  const pri = () => PRI[TY()] || PRI.adult;
  const ids = () => (typeof cnIds === 'function' ? cnIds() : CN_IDS).filter(id => CN[id] && (!['naverpay', 'nicepay'].includes(id) || payOn()));
  const rank = id => { const i = pri().indexOf(id); return i < 0 ? 99 : i; };
  const recs = () => pri().filter(id => ids().includes(id) && cnStatus(id).st === CN_ST.off).slice(0, 2);
  const nm = id => CN[id].name.replace(/\s*\(.*\)/, '');

  /* 학습자가 쓰는 연결(기관 유형별) — 학습자 앱 「나 › 앱 및 서비스 연결」과 같은 목록 */
  const LRN = () => { const t = TY(), U = /^univ/.test(t), PH = ['public', 'lifelong'].includes(t);
    const L5 = typeof lnCfg === 'function' ? lnCfg() : {};
    return [['셀프러닝 노트', [['mynote', '내 활동 모아보기(노트 · 질문 · 댓글 · 학습 기록)', '학습자가 「내 노트」에서 한곳에 모아 보고 관리합니다 — 내용은 운영자가 보지 않습니다', L5.notes !== false], ['notion', 'Notion으로 노트 보내기', '확인한 노트만 · 키는 학습자 기기에만(운영: 서버 암호화 보관)', L5.notes !== false && L5.sync !== false], ['google', 'Google Docs로 노트 보내기', '과정마다 문서 1개 · 디디쌤이 만든 문서에만 접근', L5.notes !== false && L5.sync !== false], ['linkedin', '수료증 LinkedIn 추가', '학습자가 자기 LinkedIn에서 직접 저장 — 우리가 받는 정보 없음', L5.linkedin !== false], ['gcal', '시험 목표 → 학습 캘린더', '국가자격 시험일에서 거꾸로 세운 계획을 내 일정에', L5.notes !== false && L5.goal !== false]]],
      ['학습 · AI 튜터', [['notion', '노트 앱으로 내보내기(Notion · Google Docs)', 'AI 튜터 학습 계획 · 진도 · 넘긴 질문을 노트로', true], ['anki', '복습 카드 내보내기(Anki · Quizlet)', '내 과정 퀴즈로 만든 복습 카드', true], ['github', 'GitHub 저장소', '코딩 과제 저장소 — AI 튜터가 코드에 맞춰 힌트(공개 주소만)', ['adult', 'voc', 'corp', 'lifelong'].includes(t)]]],
      ['알림 · 일정', [['gcal', '내 캘린더(Google)', '수업 · 마감이 내 캘린더에', true], ['apple', '캘린더 파일(Apple · Outlook)', '.ics 파일로 내 캘린더에 넣기', true], ['kakao', '카카오톡 알림', '수업 · 결제 안내를 카카오톡으로', !U], ['sms', '문자 알림', '시설 예약 · 강습 알림(동의 시에만 번호 수집)', PH]]],
      ['로그인 · 결제', [['naver', '간편 로그인(카카오 · 네이버 · Google)', '다음부터 한 번에 들어오기', !U], ['naverpay', '간편결제', '수강료를 간편결제로', !U && payOn()]]],
      ['영상 · 기록', [['youtube', 'YouTube 이어 보기', '기관 채널 강의를 앱에서 이어 보기', true]]]]; };

  /* v43.6 셀프러닝 노트(시안 A3 ⑧) — 「학습자가 쓰는 연결」 탭 맨 위: 기능 스위치 7개 + 개수만 보는 집계(노트 내용 · 제목 · 태그는 보지 않음)
     S.settings.lnote = { off, sync, tutor, file, yt, ytcap, goal, linkedin } — 기본 모두 켜짐(off=false), 단 「자막 요약」(ytcap)만 꺼짐(FINAL 0-13: 자막 수집은 서버 연동 · 약관 검토 후). 대학도 sync 켜짐(학습자가 자기 계정으로 보내고 우리가 받는 정보 없음).
     게시본(lsSnapshot)의 lnote로 학습자 사이트(lnote.js · lnote-ai.js · lnote-sync.js)에 내려간다. */
  const LN_K = [['notes', '내 노트 · 복습 카드', '끄면 학습자 메뉴에서 숨깁니다. 쓴 노트는 지우지 않습니다.'], ['tutor', 'AI 튜터 노트 초안', '레슨 요약 · 오답노트 초안(학습자가 확인 후 저장)'], ['sync', 'Notion · Google Docs 보내기', '학습자 노트 동기화 허용 — 키는 학습자 기기 · 서버 암호화 보관'], ['file', '파일 내려받기 (.md · .csv)', ''], ['yt', 'YouTube 영상으로 노트', '영상 주소 · 제목 · 학습자 메모로 초안을 만듭니다(자막은 읽지 않음)'], ['ytcap', '자막 요약', '공개 영상 자막을 서버가 받아 AI로 요약합니다 — 서버 연동 · 약관 검토 후 켭니다'], ['goal', '자격 시험 목표 · 역산 계획', '시험일에서 거꾸로 세운 계획 · 학습 캘린더'], ['linkedin', '수료증 LinkedIn 추가', '학습자가 자기 LinkedIn에서 직접 저장합니다']];
  /* 저장 = S.settings.lnote = { off, sync, tutor, file, yt, ytcap, goal, linkedin }(통합 결정: off=true면 학습자 노트 기능 숨김, sync 기본 true) → 게시본 SITE().lnote.
     화면 · 코드는 아래 보기 객체({ notes: !off, … })로 읽고, 바꿀 때는 lnSet으로 쓴다. 예전 시연 저장값(S.lnote)은 처음 한 번 옮긴다. */
  const LN_D = { off: false, sync: true, tutor: true, file: true, yt: true, ytcap: false, goal: true, linkedin: true };
  const lnRaw = () => { S.settings = S.settings || {}; let o = S.settings.lnote; if (!o || typeof o !== 'object') { o = {}; if (S.lnote && typeof S.lnote === 'object') { Object.assign(o, S.lnote); if ('notes' in S.lnote) o.off = S.lnote.notes === false; delete o.notes; delete S.lnote; } }
    const r = {}; Object.keys(LN_D).forEach(k => { r[k] = typeof o[k] === 'boolean' ? o[k] : LN_D[k]; }); S.settings.lnote = r; return r; };
  const lnCfg = () => { const r = lnRaw(); const v = { notes: !r.off }; Object.keys(LN_D).filter(k => k !== 'off').forEach(k => { v[k] = r[k]; }); return v; };
  const lnSet = (k, val) => { const r = lnRaw(); if (k === 'notes') r.off = !val; else if (k in LN_D) r[k] = !!val; };
  /* 집계: 시연판은 학습자 수에서 만든 예시 숫자. 운영: GET /api/selfnote/stats → { learners, writers, notes, reviewsWeek, keepRate, weeks:[8], courses:[{cid, n, notes, reviews, keep} | {cid, n:null}] }
     서버는 학습 기록(cleanLP 뒤 lp.notes)에서 개수만 센다 — 본문 · 제목 · 태그는 집계 경로에서 읽지 않는다(Node · Java 같이). 학습자 5명 미만 과정은 n:null로 보낸다(개인 추정 방지). */
  function lnStats() { const C = (S.classes || []).filter(c => !c.archived); const all = new Set(); C.forEach(c => (c.learners || []).forEach(id => all.add(id))); const N = all.size;
    const h = s => { let x = 7; for (const ch of String(s)) x = (x * 31 + ch.charCodeAt(0)) % 9973; return x; };
    const courses = C.slice(0, 8).map(c => { const n = (c.learners || []).length; if (n < 5) return { c, n: null }; const k = .45 + (h(c.id) % 30) / 100; return { c, n, notes: Math.round(n * 6.5 * k), reviews: Math.round(n * 12 * k), keep: Math.round(48 + h(c.name) % 30) }; });
    if (!N && !LIVE()) return { N: 312, writers: 148, notes: 2184, reviewsWeek: 3960, keep: 61, wk: [1660, 1890, 2010, 2240, 2480, 2790, 3310, 3960], courses, demo: true }; /* 시연판 예시 숫자(수석 공통값) */
    const writers = Math.round(N * .47); const wk = [.42, .48, .5, .56, .63, .7, .82, 1].map(f => Math.round(writers * 26.8 * f));
    return { N, writers, notes: writers * 15 - (writers % 7), reviewsWeek: wk[7], keep: N ? 61 : 0, wk, courses }; }
  const n0 = v => Number(v || 0).toLocaleString('ko-KR');
  function lnArea(a) { const w = 520, h = 150, m = Math.max(1, ...a); const top = Math.ceil(m / 1000) * 1000 || 1; const X = i => 40 + i * (w - 56) / (a.length - 1), Y = v => 14 + (h - 40) * (1 - v / top);
    const pts = a.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' '); const lab = i => { const d = addDays(today(), -7 * (a.length - 1 - i)); return `${+d.slice(5, 7)}/${+d.slice(8)}`; };
    return `<svg class="cx-ln-ch" viewBox="0 0 ${w} ${h}" role="img" aria-label="주간 복습 카드 수 최근 8주, 이번 주 ${n0(a[a.length - 1])}장"><defs><linearGradient id="cxLnG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--gr500,#00C53B)" stop-opacity=".35"/><stop offset="1" stop-color="var(--gr500,#00C53B)" stop-opacity="0"/></linearGradient></defs>
      ${[0, .5, 1].map(f => `<line x1="40" x2="${w - 16}" y1="${Y(top * f)}" y2="${Y(top * f)}" stroke="var(--line,#E7E2D9)"/><text x="32" y="${Y(top * f) + 4}" text-anchor="end">${f ? (top * f >= 1000 ? `${top * f / 1000}천` : top * f) : 0}</text>`).join('')}
      <polygon points="40,${Y(0)} ${pts} ${X(a.length - 1)},${Y(0)}" fill="url(#cxLnG)"/><polyline points="${pts}" fill="none" stroke="var(--gr700,#00862D)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(a.length - 1)}" cy="${Y(a[a.length - 1])}" r="5" fill="#fff" stroke="var(--gr700,#00862D)" stroke-width="2.5"/>
      ${[0, Math.floor(a.length / 2), a.length - 1].map(i => `<text x="${X(i)}" y="${h - 6}" text-anchor="${i ? i === a.length - 1 ? 'end' : 'middle' : 'start'}">${lab(i)}</text>`).join('')}</svg>`; }
  function lnHTML() { const c = lnCfg(); const s = lnStats(); const sp = a => spark(a, 96, 22);
    const sw = ([k, n, d]) => `<div class="cx-ln-sw ${k === 'ytcap' ? 'sub' : ''}"><span class="cx-tx"><b>${esc(n)}${k === 'ytcap' ? ` ${tag('AI 사용량', 'y')}` : ''}</b>${d ? `<small>${esc(d)}</small>` : ''}</span><button type="button" class="cx-ln-t ${c[k] ? 'on' : ''}" role="switch" aria-checked="${!!c[k]}" aria-label="${esc(n)}" data-act="cnx-ln" data-v="${k}" ${(k !== 'notes' && !c.notes) || (k === 'ytcap' && !c.yt) ? 'disabled' : ''}></button></div>`;
    return `<section class="cx-ln" aria-labelledby="cxLnH"><div class="cx-ln-hero"><div><p class="cx-ey"><i aria-hidden="true"></i>이번 주 · 셀프러닝 노트</p><h2 id="cxLnH">${s.N ? `학습자 ${n0(s.N)}명 중 ${n0(s.writers)}명이<br>노트로 스스로 복습하고 있습니다` : '학습자가 생기면<br>노트 · 복습 현황을 개수로 보여 드립니다'}</h2><p>노트 내용 · 제목은 운영자도 볼 수 없습니다. 아래 숫자는 개수만 셉니다.${LIVE() ? '' : ' (시연판 예시 숫자)'}</p><p class="cx-ln-act">학습자는 「내 노트」에서 내 활동(노트 · 질문 · 댓글 · 학습 기록)을 모아 보고 관리합니다. 내용은 운영자가 보지 않습니다.</p></div>
      <div class="cx-kp">${[[n0(s.notes), '전체 노트', s.wk.map((v, i) => i + 1)], [n0(s.reviewsWeek), '이번 주 복습', s.wk], [s.keep + '%', '복습 이어 감', [52, 55, 54, 57, 58, 60, 59, 61]]].map(([v, l, a]) => `<div class="cx-k"><b>${v}</b><span>${l}</span>${sp(a)}</div>`).join('')}</div></div>
      <div class="cx-ln-g"><div class="card cx-ln-c"><div class="cx-sh"><b>학습자 기능</b><span class="mini">바꾸면 바로 적용</span></div>${LN_K.map(sw).join('')}<p class="mini cx-ln-n">${/^univ/.test(TY()) ? '대학도 켤 수 있습니다. 학습자가 자기 계정으로 보내고, 디디쌤이 받는 정보는 없습니다(학번 · 학과 외 수집 없음).' : '학습자 연결은 기본 꺼짐이고, 학습자가 켤 때 무엇을 · 왜 · 끄면 지운다는 안내를 같은 화면에 보여 줍니다.'}</p></div>
        <div class="cx-ln-r"><div class="card cx-ln-c"><div class="cx-sh"><b>주간 복습 카드 수</b><span class="mini">최근 8주</span></div>${lnArea(s.wk)}</div>
        <div class="card cx-ln-c"><div class="cx-sh"><b>과정별</b><span class="mini">개수만</span></div>${s.courses.length ? `<table class="cx-ln-tb mobux"><thead><tr><th>과정</th><th>노트</th><th>복습</th><th>이어 감</th></tr></thead><tbody>${s.courses.map(x => x.n == null ? `<tr class="cx-ln-hide"><td data-l="과정">${esc(x.c.name)}</td><td colspan="3" data-l="">5명 미만이라 표시하지 않습니다</td></tr>` : `<tr><td data-l="과정">${esc(x.c.name)}</td><td data-l="노트">${n0(x.notes)}</td><td data-l="복습">${n0(x.reviews)}</td><td data-l="이어 감"><span class="cx-ln-bar"><i style="width:${x.keep}%"></i></span> ${x.keep}%</td></tr>`).join('')}</tbody></table>` : '<p class="mini">과정이 생기면 과정별 개수를 보여 드립니다.</p>'}</div></div></div></section>`; }
  const LIVE = () => { try { return typeof isLive === 'function' ? isLive() : false; } catch (e) { return false; } };
  ACT['cnx-ln'] = el => { const k = el.dataset.v; if (!LN_K.some(x => x[0] === k)) return; lnSet(k, !lnCfg()[k]); const c = lnCfg(); const nm = LN_K.find(x => x[0] === k)[1];
    logAudit(`셀프러닝 노트 — ${nm} ${c[k] ? '켬' : '끔'}`); save(); render(); toast(`${nm}을(를) ${c[k] ? '켰습니다' : '껐습니다'}. 학습자 사이트를 게시하면 반영됩니다.`, 'ok'); };
  { const wrap = () => { if (typeof lsSnapshot !== 'function' || lsSnapshot.__ln) return false; const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { if (r) r.lnote = Object.assign({}, lnRaw()); } catch (e) { console.error('connx lnote snap', e); } return r; }; lsSnapshot.__ln = 1; window.lsSnapshot = lsSnapshot; return true; };
    if (!wrap()) addEventListener('DOMContentLoaded', wrap); }

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
      : `<p class="mini cx-lnote">${/^univ/.test(TY()) ? '대학은 학번 · 학과 외 정보를 받지 않으므로 휴대폰 · SNS 연결은 보이지 않습니다. 학습자는 앱 「나 › 앱 및 서비스 연결」에서 직접 켜고 끕니다(기본 꺼짐).' : '학습자는 앱 「나 › 앱 및 서비스 연결」에서 직접 켜고 끕니다. 기본은 모두 꺼짐이고, 켤 때 목적 · 보관 기간을 보여 주고 동의를 남깁니다.'}</p>${lnHTML()}<div class="cx-grps">${LRN().map(([t, L]) => `<section class="cx-grp"><div class="cx-gh"><b>${t}</b></div>${L.map(([b, n, u, ok]) => `<div class="cx-row cx-lr ${ok ? '' : 'off'}">${b === 'linkedin' || b === 'mynote' ? `<span class="brl brl-t" role="img" aria-label="${b === 'linkedin' ? 'LinkedIn' : '내 노트'}" style="width:44px;height:44px;font-size:17px;color:#3F3A33">${b === 'linkedin' ? 'L' : '노'}</span>` : typeof brandLogo === 'function' ? brandLogo(b, 44, n) : ''}<span class="cx-tx"><b>${esc(n)}</b><small>${esc(u)}</small></span>${tag(ok ? '학습자에게 보임' : t === '셀프러닝 노트' ? '기능 꺼짐' : '이 기관 유형은 숨김', ok ? 'g' : '')}</div>`).join('')}</section>`).join('')}</div>`;
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

/* 13차 MS Teams 연동(기획 F/grp/teams.md 2절 · 대표님 2026-11-27 「MS 팀즈 연결도 추가해야 돼. 빠졌네」)
   - 카드 CN.teams: 머리(상태 · 조직 도메인 · 최근 시험) + 단계 3(준비 → 입력 → 시험) + 탭 4(조직 연결 · 채널 알림 · 온라인 수업 · 로그인) + 받는 모습 미리보기 + 연결 해제
   - 운영 서버가 있으면 /api/conn/teams/*(토큰 · 워크플로 주소는 서버에만, 화면에는 가린 값) · 없으면(데모 사이트) 이 브라우저 시연 상태(S.settings.conn.teams — 비밀값 없음)
   - 자동화: 「Teams 채널 알림」 단계 · Slack 알림 단계가 돌 때 Teams가 연결돼 있으면 같은 알림을 Teams로도 보낸다 · 레시피 2종
   - 수업: 라이브 항목 편집기에 「회의 링크 만들기」(Zoom · Microsoft Teams 나란히) · 출석관리 옆 [Teams 출석 가져오기](제안 → 담당자가 반영) */
(() => {
  if (typeof CN !== 'object' || typeof cnEnsure !== 'function') return;
  const LV = () => { try { return typeof LIVE !== 'undefined' && LIVE && LIVE.cfg && LIVE.cfg.live && !!LIVE.user; } catch (e) { return false; } };
  const EVK = [['notice', '공지'], ['due', '마감 임박'], ['approval', '승인 요청'], ['report', '주간 리포트'], ['signup', '가입'], ['pay', '결제']];
  const payOn = () => typeof mbPayOn !== 'function' || mbPayOn();
  CN.teams = { name: 'Microsoft Teams', logo: 'T', col: '#4B53BC', use: '채널 알림 · 온라인 수업 링크와 출석 · Microsoft 계정 로그인', guide: 'cn-teams',
    steps: ['Teams에서 알림을 받을 채널의 [⋯] › [워크플로]를 누르고 「Send webhook alerts to a channel(웹후크 경고를 채널로 보내기)」 템플릿을 고릅니다.', '워크플로 이름(예: 디디쌤 알림)을 정하고 팀 · 채널을 확인한 뒤 [워크플로 추가]를 누릅니다. 생성된 주소를 [복사]합니다.', '아래 「채널 알림」 탭에 붙여 넣고 [저장하고 시험]을 누릅니다. 채널에 시험 카드가 오면 연결이 끝납니다.', '온라인 수업 · 로그인까지 쓰려면 「조직 연결」 탭에서 [조직 연결]을 눌러 Microsoft 365 관리자 계정으로 로그인하고 권한을 승인합니다.'],
    alt: '워크플로는 만든 사람 계정에 묶입니다. 담당자가 바뀌어도 끊기지 않게 워크플로 공동 소유자를 한 명 더 지정하십시오. 기존 「수신 웹후크(커넥터)」 주소는 2026년 5월 Microsoft가 종료해 쓸 수 없습니다.' };
  if (!CN_IDS.includes('teams')) CN_IDS.splice(Math.max(0, CN_IDS.indexOf('slack') + 1), 0, 'teams');

  /* 상태: 운영 = 서버 응답 캐시 TM.v, 데모 = 로컬 시연 상태 */
  const TM = { v: null, busy: false, err: '' };
  const OFF = () => LV() && !!TM.v && TM.v.pilot === false; /* QA4 #5 시범 플래그 꺼진 운영 기관: Teams 카드 · 회의 버튼 감춤(서버도 teams_off) */
  if (typeof AFTER === 'object' && AFTER.push) AFTER.push(() => { if (LV()) pull(); });
  const loc = () => { const c = cnEnsure(); c.teams = Object.assign({ st: CN_ST.off, demo: false, channels: [], md: { lobby: 'organization', attMin: 10 }, sso: { operator: false, learner: false }, runs: [] }, c.teams || {}); return c.teams; };
  const ssoType = () => ['univ', 'univ_lms', 'corp', 'public'].includes((S.org && S.org.type) || '');
  function view() {
    if (LV()) return TM.v;
    const t = loc(); const ch = t.channels || [];
    return { mode: 'demo', local: true, st: t.demo || ch.length ? CN_ST.on : CN_ST.off, demo: t.demo, note: ch.length ? `알림 채널 ${ch.length}곳(시연)` : '', org: t.demo ? { domain: 'demo.onmicrosoft.com', demo: true } : null,
      features: { notify: true, meeting: true, sso: false, learner: !!(t.lrn && t.lrn.on) }, learnerNoti: { typeOk: lnType(), on: !!(t.lrn && t.lrn.on), events: (t.lrn && t.lrn.events) || ['due', 'notice'], optIn: 0, agreeVer: 'teams-lrn-v1', local: true }, meetingDefaults: t.md, channels: ch, accounts: [], sso: { operator: false, learner: false, tids: [] }, ssoTypeOk: ssoType(), scopesAvail: ['notify'], runs: t.runs || [] };
  }
  const repaint = () => { const n = document.getElementById('cnCard-teams'); if (n) { const d = document.createElement('div'); d.innerHTML = cnCard('teams'); n.replaceWith(d.firstElementChild); } if (typeof CUR === 'object' && CUR.tab === 'conn') render(); };
  async function pull(force) { if (!LV() || TM.busy || (TM.v && !force)) return; TM.busy = true; try { TM.v = await api('GET', '/api/conn/teams'); TM.err = ''; if (OFF()) { const i = CN_IDS.indexOf('teams'); if (i >= 0) CN_IDS.splice(i, 1); if (typeof CUR === 'object' && CUR.tab === 'conn' && typeof render === 'function') render(); } } catch (e) { TM.err = (e && e.message) || '불러오지 못했습니다.'; } TM.busy = false; repaint(); }
  const call = async (m, p, b, ok) => { try { const r = await api(m, p, b); if (r && r.mode) TM.v = r; else await pull(true); if (ok) toast(ok, 'ok'); repaint(); return r || {}; } catch (e) { toast((e && e.message) || '처리하지 못했습니다.', 'bad'); return null; } };

  { const base = cnStatus; cnStatus = id => { if (id !== 'teams') return base(id); const v = view();
      if (!v) { pull(); return { st: CN_ST.off, note: LV() ? '연결 상태를 불러오는 중입니다' : 'Teams 미연결' }; }
      const st = v.st === '점검 필요' ? CN_ST.chk : v.st === '진행 중' ? (CN_ST.prog || '진행 중') : v.st === '연결됨' ? CN_ST.on : CN_ST.off;
      return { st, note: v.note || (v.org ? `${v.org.domain || 'Microsoft 365'}${v.demo || v.org.demo ? ' · 시연' : ''}` : st === CN_ST.off ? '채널 알림 · 회의 · 로그인 미설정' : '') }; }; }

  const TABS = [['org', '조직 연결'], ['ch', '채널 알림'], ['mt', '온라인 수업'], ['sso', '로그인']];
  /* v49.1 L-noti-teams: 대학 · 기업 기관만 「학습자 알림」 탭(기관이 켜고 → 학습자가 앱 · 웹 「연결 · 알림」에서 본인 동의로 켬). 다른 유형 · 시범 밖은 탭 4개 그대로 */
  const lnType = () => ['univ', 'univ_lms', 'corp'].includes((S.org && S.org.type) || '');
  const tabsOf = v => lnType() && v && v.learnerNoti && v.learnerNoti.typeOk !== false ? [...TABS, ['ln', '학습자 알림']] : TABS;
  const prevCard = () => `<div class="cx-prev tm-prev"><small>받는 사람이 보는 모습(Teams 채널)</small><div class="tm-ac"><span class="tm-ac-h">디디쌤 · 승인 요청</span><b>수강 승인 요청 3건이 기다리고 있습니다</b><p>학습자 이름 · 연락처는 보내지 않고 건수만 알립니다.</p><span class="tm-ac-b">디디쌤에서 보기</span></div></div>`;
  function tabBody(k, v, admin, owner) {
    const live = v.mode === 'live';
    if (k === 'org') return v.org ? `<dl class="cn-dl"><dt>연결 조직</dt><dd>${esc(v.org.domain || '—')}${v.org.demo ? ` ${tag('시연', 'b')}` : ''}</dd>${v.org.msTid ? `<dt>조직 ID</dt><dd><code>${esc(v.org.msTid)}</code></dd>` : ''}${v.org.consentAt ? `<dt>관리자 동의</dt><dd>${esc(v.org.consentAt)} · ${esc(v.org.consentBy || '')}</dd>` : ''}</dl>${live && owner ? `<button class="btn sm" data-act="tm-consent">${ic('check', 13)} 권한 다시 동의받기</button>` : ''}`
      : `<p class="mini">온라인 수업(회의 만들기 · 출석)과 Microsoft 계정 로그인은 기관 Microsoft 365 관리자가 한 번 동의해야 열립니다. 요청 권한: 회의 만들기(OnlineMeetings.ReadWrite) · 출석 보고서 읽기(OnlineMeetingArtifact.Read.All) · 로그인(openid). 디렉터리 · 메일 · 녹화 권한은 요청하지 않습니다.</p>
        <div class="bar2">${live ? (owner ? `<button class="btn ink sm" data-act="tm-consent">${ic('globe', 14)} 조직 연결(관리자 동의)</button>` : '<span class="mini">조직 연결은 정운영자만 할 수 있습니다.</span>') : `<span class="mini">${v.local ? '데모 사이트에서는' : 'Microsoft 앱 키가 서버에 설정되지 않아'} 시연으로만 연결합니다.</span>`}${admin && !live ? `<button class="btn sm" data-act="tm-demo">시연으로 연결</button>` : ''}</div>`;
    if (k === 'ch') { const L = v.channels || [];
      const list = L.length ? `<ul class="tm-list">${L.map(c => `<li><div><b>${esc(c.name)}</b><small>${esc(c.kind === 'demo' ? '시연 채널(실제 발송 없음)' : c.mask)}${c.lastOk ? ` · 마지막 성공 ${esc(c.lastOk)}` : ''}</small><span class="tm-evs">${(c.events || []).map(e => `<i>${esc((EVK.find(x => x[0] === e) || [e, e])[1])}</i>`).join('')}</span>${c.err ? `<small class="tm-err">${esc(c.err)} — 워크플로가 켜져 있는지 확인하십시오</small>` : ''}</div>${admin ? `<span class="tm-la"><button class="btn sm ghost" data-act="tm-chtest" data-v="${esc(c.id)}">시험</button><button class="btn sm ghost" data-act="tm-chdel" data-v="${esc(c.id)}" aria-label="${esc(c.name)} 채널 삭제">삭제</button></span>` : ''}</li>`).join('')}</ul>` : '<p class="mini">등록한 알림 채널이 없습니다.</p>';
      return list + (admin ? `<div class="tm-add"><div class="form2 cn-f2"><label class="fl">채널 이름<input id="tmChName" maxlength="40" placeholder="예: 교육운영"></label><label class="fl">워크플로 주소${v.local ? '(데모 사이트는 이름만)' : ''}<input type="password" id="tmChUrl" autocomplete="off" spellcheck="false" placeholder="https://…logic.azure.com/workflows/…" ${v.local ? 'disabled' : ''}></label></div>
        <fieldset class="tm-evck"><legend class="mini">보낼 알림</legend>${EVK.filter(([e]) => e !== 'pay' || payOn()).map(([e, n]) => `<label class="ckl"><input type="checkbox" name="tmEv" value="${e}" ${['notice', 'due', 'approval'].includes(e) ? 'checked' : ''}> ${n}</label>`).join('')}</fieldset>
        <div class="bar2"><button class="btn ink sm" data-act="tm-chadd">${ic('send', 14)} ${live || !v.local ? '저장하고 시험' : '시연 채널 추가'}</button>${!v.local && !live ? '<button class="btn sm" data-act="tm-chadd" data-demo="1">주소 없이 시연 채널</button>' : ''}</div></div>` : ''); }
    if (k === 'mt') { const md = v.meetingDefaults || {}; const A = v.accounts || [];
      return `${A.length ? `<ul class="tm-list">${A.map(a => `<li><div><b>${esc(a.upn)}</b><small>${esc(a.role)}${a.exp === 'reauth' ? ' · 만료 — 다시 연결하십시오' : ' · 사용 가능'}</small></div>${a.mine || owner ? `<span class="tm-la"><button class="btn sm ghost" data-act="tm-acdel" data-v="${esc(a.id)}">연결 끊기</button></span>` : ''}</li>`).join('')}</ul>` : `<p class="mini">${live ? '회의를 여는 교수자 · 운영자가 각자 Microsoft 계정을 연결합니다. 회의는 연결한 사람 이름으로 만들어집니다.' : '시연 모드에서는 계정 연결 없이 「시연 링크」로 회의 만들기 · 출석 가져오기를 체험할 수 있습니다.'}</p>`}
        ${live ? `<button class="btn sm" data-act="tm-acct" ${v.org ? '' : 'disabled title="조직 연결 후 사용"'}>${ic('plus', 13)} 내 Microsoft 계정 연결</button>` : ''}
        ${admin ? `<div class="form2 cn-f2 tm-md"><label class="fl">대기실 바로 입장<select id="tmLobby"><option value="organization" ${md.lobby !== 'everyone' ? 'selected' : ''}>우리 조직 사람만</option><option value="everyone" ${md.lobby === 'everyone' ? 'selected' : ''}>모두(외부 학습자 포함)</option></select></label><label class="fl">출석 인정 최소 참여(분)<input id="tmAttMin" type="number" min="0" max="600" value="${esc(md.attMin ?? 10)}"></label></div><button class="btn sm" data-act="tm-md">기본값 저장</button><p class="mini">자동 녹화는 하지 않습니다. 출석은 Teams 참석 보고서로 「제안」만 만들고, 담당자가 확인 후 반영합니다.</p>` : ''}`; }
    if (k === 'ln') { const ln = v.learnerNoti || {}; const ev = ln.events || ['due', 'notice']; const ready = live ? !!(v.org && (v.sso || {}).learner) : !!(v.org || v.demo);
      return `<p class="mini">학습자가 앱 · 웹 「연결 · 알림」에서 직접 켜면 공지 · 마감 임박 알림을 Teams 활동 피드로도 받습니다. 기관이 먼저 켜고, 학습자마다 본인 동의를 받습니다. 보내는 내용은 공지 제목 · 과정 이름뿐이며 이름 · 학번 · 성적은 보내지 않습니다.</p>
        <dl class="cn-dl"><dt>상태</dt><dd>${ln.on ? `켜짐 ${tag(live ? '운영' : '시연', live ? 'g' : 'b')}` : '꺼짐'}</dd>${ln.on && !ln.local ? `<dt>동의한 학습자</dt><dd>${ln.optIn >= 1 && ln.optIn <= 4 ? '5명 미만' : `${nf0(ln.optIn)}명`}</dd>` : ''}</dl>
        ${ready ? '' : `<p class="mini">${live ? '먼저 「조직 연결」을 마치고 「로그인」에서 학습자 Microsoft 로그인을 켜십시오.' : '먼저 「조직 연결」에서 시연으로 연결하십시오.'}</p>`}
        ${admin ? `<fieldset class="tm-evck"><legend class="mini">보낼 알림</legend>${[['notice', '공지'], ['due', '마감 임박']].map(([e, n]) => `<label class="ckl"><input type="checkbox" name="tmLnEv" value="${e}" ${ev.includes(e) ? 'checked' : ''}> ${n}</label>`).join('')}</fieldset>
        <div class="bar2">${ln.on ? '<button class="btn sm" data-act="tm-ln" data-v="save">알림 종류 저장</button><button class="btn sm ghost" data-act="tm-ln" data-v="off">학습자 알림 끄기</button>' : `<button class="btn sm ink" data-act="tm-ln" data-v="on" ${ready ? '' : 'disabled'}>학습자 알림 켜기</button>`}</div>
        <p class="mini">끄면 학습자 동의 기록을 모두 지웁니다.${live ? ' 실제 발송은 Teams 앱(조직 앱 카탈로그) 배포 후 시작합니다 — 그전에는 최근 실행에 「대기」로 남습니다.' : ' 시연은 실제로 보내지 않고 최근 실행에만 남깁니다.'}</p>` : ''}`; }
    if (k === 'sso') { const s = v.sso || {};
      if (!live) return `<p class="mini">Microsoft 계정 로그인은 서버에 Microsoft 앱 키가 설정된 뒤 사용할 수 있습니다(시연 로그인은 만들지 않습니다).</p>`;
      if (!v.org) return '<p class="mini">먼저 「조직 연결」을 완료하십시오.</p>';
      return `<label class="ckl"><input type="checkbox" id="tmSsoOp" ${s.operator ? 'checked' : ''} ${owner ? '' : 'disabled'}> 운영자 · 교수자 로그인에 「Microsoft로 계속하기」 표시</label>${v.ssoTypeOk ? `<label class="ckl"><input type="checkbox" id="tmSsoLn" ${s.learner ? 'checked' : ''} ${owner ? '' : 'disabled'}> 학습자 로그인에 「학교(회사) Microsoft 계정으로 계속하기」 표시</label>` : ''}
        <p class="mini">이메일은 받지 않으며 학번 · 학과는 기존처럼 첫 로그인에서 입력합니다. 이메일이 같아도 기존 운영자 계정에 자동으로 연결하지 않습니다 — 운영자는 로그인한 뒤 [Microsoft 계정 연결]로 직접 연결합니다.</p>
        <div class="bar2">${owner ? '<button class="btn sm ink" data-act="tm-sso">로그인 설정 저장</button>' : ''}<button class="btn sm" data-act="tm-link">내 Microsoft 계정 연결</button></div>`; }
    return '';
  }
  { const base = cnCard; cnCard = id => { if (id !== 'teams') return base(id); const d = CN.teams; const s = cnStatus('teams'); const v = view();
      if (!v) return `<div class="card cn-card cx-card" id="cnCard-teams" data-st="${esc(s.st)}"><div class="cn-h">${typeof brandLogo === 'function' ? brandLogo('teams', 44, d.name) : ''}<div><b>${esc(d.name)}</b><small>${esc(d.use)}</small></div></div><p class="cn-note">${esc(TM.err || s.note)}</p></div>`;
      const admin = S.me && ['owner', 'sub', 'admin'].includes(S.me.role); const owner = S.me && S.me.role === 'owner'; const tab = tabsOf(v).some(t => t[0] === UI.tmTab) ? UI.tmTab : 'ch';
      const n = s.st === CN_ST.on ? 3 : s.st === CN_ST.off ? 1 : 2;
      const last = (v.runs || [])[0];
      return `<div class="card cn-card cx-card tm-card" id="cnCard-teams" data-st="${esc(s.st)}"><div class="cn-h">${typeof brandLogo === 'function' ? brandLogo('teams', 44, d.name) : `<span class="cn-logo" style="background:${d.col}">T</span>`}<div><b>${esc(d.name)}</b><small>${esc(d.use)}</small></div>${tag(s.st === CN_ST.off ? '미연결' : s.st, s.st === CN_ST.on ? 'g' : s.st === CN_ST.chk ? 'y' : s.st === CN_ST.off ? '' : 'b')}${v.mode === 'demo' ? tag('시연', 'b') : ''}</div>
        <ol class="cx-steps" aria-label="연결 단계">${['준비하기', '워크플로 주소 · 조직 연결', '시험 · 완료'].map((t, i) => `<li class="${i + 1 < n ? 'done' : i + 1 === n ? 'cur' : ''}"><i>${i + 1 < n ? '✓' : i + 1}</i>${esc(t)}</li>`).join('')}</ol>
        <p class="cn-note">${esc(s.note)}</p>${cnGuideHTML('teams', s.st !== CN_ST.on)}
        <div class="seg2 tm-tabs" role="tablist" aria-label="Teams 연결 항목">${tabsOf(v).map(([k, l]) => `<button type="button" role="tab" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}" data-act="tm-tab" data-v="${k}">${l}</button>`).join('')}</div>
        <div class="cn-body tm-body" role="tabpanel">${tabBody(tab, v, admin, owner)}</div>${tab === 'ch' ? prevCard() : ''}
        <div class="bar2 cn-acts">${s.st !== CN_ST.off && owner ? `<button class="btn sm ghost" data-act="cn-off" data-v="teams">연결 해제</button>` : ''}<button class="btn sm ghost" data-act="gd-start" data-v="cn-teams">${ic('spark', 13)} 따라하기</button></div>${last ? `<p class="mini cn-last">최근 실행: ${esc(last.at || '')} · ${esc(last.ch || '')} ${esc(last.title || '')}${last.demo ? '(시연)' : last.ok === false ? '(실패)' : ''}</p>` : ''}</div>`; }; }

  const evSel = () => [...document.querySelectorAll('input[name="tmEv"]:checked')].map(x => x.value);
  const kst = () => nowStr();
  ACT['tm-tab'] = el => { UI.tmTab = el.dataset.v; repaint(); };
  ACT['tm-consent'] = () => { location.href = '/api/conn/teams/consent/start?f=meeting,sso'; };
  ACT['tm-acct'] = () => { location.href = '/api/conn/teams/account/start'; };
  ACT['tm-link'] = async () => { try { const r = await api('POST', '/api/oauth/microsoft/link-start'); if (r && r.url) location.href = r.url; } catch (e) { toast((e && e.message) || '연결을 시작하지 못했습니다.', 'bad'); } };
  ACT['tm-demo'] = async () => { if (LV()) { await call('PUT', '/api/conn/teams/demo', { on: true }, 'Microsoft Teams를 시연으로 연결했습니다.'); } else { const t = loc(); t.demo = true; t.st = CN_ST.on; cnLog('teams', '시연 연결', true); logAudit('외부 연결 — Microsoft Teams 시연 연결'); save(); repaint(); toast('Microsoft Teams를 시연으로 연결했습니다. 알림은 보내지 않고 최근 실행에만 기록합니다.', 'ok'); }
    if (typeof gdSig === 'function') gdSig('cn_teams'); };
  ACT['tm-chadd'] = async el => { const name = (document.getElementById('tmChName') || {}).value || ''; const url = ((document.getElementById('tmChUrl') || {}).value || '').trim(); const events = evSel();
    if (!name.trim()) { toast('채널 이름을 넣으십시오.', 'warn'); document.getElementById('tmChName')?.focus(); return; } if (!events.length) { toast('보낼 알림을 하나 이상 고르십시오.', 'warn'); return; }
    if (LV()) { const demo = el.dataset.demo === '1'; if (!url && !demo && TM.v && TM.v.mode === 'live') { toast('Teams 워크플로 주소를 붙여 넣으십시오. 모르시면 위 단계 안내를 따르십시오.', 'warn'); document.getElementById('tmChUrl')?.focus(); return; }
      el.disabled = true; const r = await call('POST', '/api/conn/teams/channels', { name: name.trim(), ...(url ? { url } : { demo: true }), events }, url ? `「${name.trim()}」 채널에 시험 카드를 보냈습니다. 채널에서 확인하십시오.` : '시연 채널을 추가했습니다.'); el.disabled = false; if (r && typeof gdSig === 'function') gdSig('cn_teams'); return; }
    const t = loc(); if (t.channels.length >= 10) { toast('알림 채널은 기관당 10곳까지 등록할 수 있습니다.', 'warn'); return; }
    t.channels.push({ id: 'ch_' + Math.random().toString(36).slice(2, 12), name: name.trim().slice(0, 40), kind: 'demo', mask: '시연 채널', events, lastOk: '', err: '' }); t.st = CN_ST.on;
    t.runs.unshift({ at: kst(), ch: name.trim(), title: '시연 채널 등록', demo: true }); t.runs = t.runs.slice(0, 10); cnLog('teams', `시연 채널 「${name.trim()}」 추가`, true); logAudit('외부 연결 — Microsoft Teams 채널 추가(시연)'); save(); repaint(); toast('시연 채널을 추가했습니다.', 'ok'); if (typeof gdSig === 'function') gdSig('cn_teams'); };
  ACT['tm-chtest'] = async el => { const id = el.dataset.v; if (LV()) { try { const r = await api('POST', '/api/conn/teams/test', { channelId: id }); toast(r.note, 'ok'); } catch (e) { toast((e && e.message) || '보내지 못했습니다.', 'bad'); } return pull(true); }
    const t = loc(); const c = t.channels.find(x => x.id === id); if (!c) return; t.runs.unshift({ at: kst(), ch: c.name, title: '연결 시험', demo: true }); t.runs = t.runs.slice(0, 10); save(); repaint(); toast('시연 채널이라 실제로 보내지 않고 최근 실행에 기록했습니다.', 'ok'); };
  ACT['tm-chdel'] = el => { const id = el.dataset.v; modal('알림 채널 삭제', '<p>이 채널로 보내던 Teams 알림을 멈춥니다. 저장된 워크플로 주소는 서버에서 지웁니다.</p>', [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { if (LV()) call('DELETE', '/api/conn/teams/channels/' + encodeURIComponent(id), null, '채널을 삭제했습니다.'); else { const t = loc(); t.channels = t.channels.filter(x => x.id !== id); if (!t.channels.length && !t.demo) t.st = CN_ST.off; save(); repaint(); toast('채널을 삭제했습니다.'); } } }]); };
  ACT['tm-acdel'] = el => call('DELETE', '/api/conn/teams/account/' + encodeURIComponent(el.dataset.v), null, '회의 계정 연결을 끊었습니다.');
  ACT['tm-md'] = () => { const lobby = (document.getElementById('tmLobby') || {}).value === 'everyone' ? 'everyone' : 'organization'; const attMin = Math.max(0, Math.min(600, parseInt((document.getElementById('tmAttMin') || {}).value, 10) || 0));
    if (LV()) return call('PUT', '/api/conn/teams/settings', { meetingDefaults: { lobby, attMin } }, '회의 기본값을 저장했습니다.'); const t = loc(); t.md = { lobby, attMin }; save(); repaint(); toast('회의 기본값을 저장했습니다.', 'ok'); };
  const nf0 = n => (Number(n) || 0).toLocaleString('ko-KR');
  ACT['tm-ln'] = el => { const d = el.dataset.v; const events = [...document.querySelectorAll('[name=tmLnEv]:checked')].map(x => x.value); const on = d !== 'off';
    if (on && !events.length) { toast('보낼 알림을 하나 이상 고르십시오.', 'warn'); return; }
    const done = d === 'off' ? '학습자 Teams 알림을 껐습니다. 학습자 동의 기록을 지웠습니다.' : d === 'save' ? '보낼 알림 종류를 저장했습니다.' : '학습자 Teams 알림을 켰습니다. 학습자는 「연결 · 알림」에서 본인 동의로 켭니다.';
    if (LV()) return call('PUT', '/api/conn/teams/learner', { on, events }, done);
    const t = loc(); t.lrn = on ? { on: true, events } : { on: false, events }; cnLog('teams', on ? '학습자 알림 켜기(시연)' : '학습자 알림 끄기(시연)', true); logAudit(`외부 연결 — Microsoft Teams 학습자 알림 ${on ? '켜기' : '끄기'}(시연)`); save(); repaint(); toast(done, 'ok'); };
  /* 시연판: 학습자 사이트 스냅샷에 기관 켜짐만(동의 · 발송은 학습자 브라우저) — 운영은 서버 /api/pub/<tid>/teams-noti가 판단 */
  if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = (...a) => { const o = base(...a); try { const t = !LV() && lnType() ? ((cnEnsure() || {}).teams || {}).lrn : null; if (o && t && t.on) o.teamsLrn = { on: true, events: t.events || ['due', 'notice'] }; } catch (e) { } return o; }; } /* eslint-disable-line no-global-assign */
  ACT['tm-sso'] = () => call('PUT', '/api/conn/teams/sso', { operator: !!(document.getElementById('tmSsoOp') || {}).checked, learner: !!(document.getElementById('tmSsoLn') || {}).checked }, '로그인 설정을 저장했습니다.');
  { const b = ACT['cn-test']; ACT['cn-test'] = el => el.dataset.v === 'teams' ? (UI.tmTab = 'ch', repaint()) : b(el); }
  { const b = ACT['cn-demo']; ACT['cn-demo'] = el => el.dataset.v === 'teams' ? ACT['tm-demo'](el) : b(el); }
  { const base = cnOff; cnOff = id => { if (id !== 'teams') return base(id);
      modal('Microsoft Teams 연결 해제', '<p>알림 채널 · 회의 계정 · 로그인 설정을 모두 해제합니다. 저장된 워크플로 주소와 토큰은 서버에서 파기하고, 이미 만든 회의 링크는 수업에 그대로 남깁니다.</p><p class="mini">Microsoft 쪽 앱 동의 철회는 Entra 관리 센터 › 엔터프라이즈 애플리케이션에서 디디쌤 앱을 삭제하십시오.</p>', [{ id: 'c', label: '취소' }, { id: 'ok', label: '연결 해제', kind: 'red', run: () => {
        if (LV()) call('DELETE', '/api/conn/teams', null, 'Microsoft Teams 연결을 해제했습니다.'); else { cnEnsure().teams = null; loc(); cnLog('teams', '연결 해제', true); logAudit('외부 연결 해제 — Microsoft Teams'); save(); repaint(); toast('Microsoft Teams 연결을 해제했습니다.'); } } }]); }; }

  /* 조직 연결 · 계정 연결 결과(#conn=teams:…) — 스크립트를 읽을 때 걷어 두고, 화면이 준비되면 알린다 */
  const BACK = { ok: '조직 연결을 마쳤습니다. 이제 회의 만들기 · 로그인을 쓸 수 있습니다.', 'err-off': 'Microsoft Teams 연동은 시범 운영 기관에서만 사용할 수 있습니다.', 'acct-ok': 'Microsoft 회의 계정을 연결했습니다.', 'err-state': '연결 요청이 만료되었습니다. 다시 시도하십시오.', 'err-denied': 'Microsoft 동의 화면에서 허용하지 않았습니다.', 'err-tenant_taken': '이 Microsoft 조직은 다른 기관에 이미 연결되어 있습니다.', 'err-tenant_mismatch': '기관에 연결된 Microsoft 조직의 계정이 아닙니다.', 'err-unset': 'Microsoft 앱 키가 서버에 설정되지 않아 시연으로만 연결할 수 있습니다.', 'err-consent': '먼저 조직 관리자 동의(조직 연결)를 완료하십시오.', 'err-role': '조직 연결은 정운영자만 할 수 있습니다.', 'err-msa': '개인 Microsoft 계정은 쓸 수 없습니다. 학교 · 회사 계정으로 로그인하십시오.', 'err-provider': 'Microsoft와 연결하지 못했습니다. 잠시 후 다시 시도하십시오.' };
  let back = ''; { const m = /^#conn=teams:([\w-]{1,40})$/.exec(location.hash || ''); if (m) { back = m[1]; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } } }
  if (typeof AFTER === 'object' && AFTER.push) AFTER.push(() => { if (!back || !S || !S.me) return; const v = back; back = ''; setTimeout(() => { toast(BACK[v] || 'Teams 연결 결과를 확인하십시오.', /^err/.test(v) ? 'warn' : 'ok'); pull(true); if (S.me.role === 'owner' && ACT['cn-open']) ACT['cn-open']({ dataset: { v: 'teams' } }); }, 50); });

  /* 자동화: Teams 채널 알림 단계 · Slack 단계와 같은 지점에서 Teams로도 · 레시피 2종 */
  Object.assign(ACTION, { teams: 'Microsoft Teams 채널 알림' });
  Object.assign(CN_ACT, { teams: ['teams', '', 'Microsoft Teams'] });
  const evOf = a => { const t = String((a && a.tr) || ''); const k = String((a && a.key) || ''); return /join|signup/.test(t + k) ? 'signup' : /pay|refund/.test(t + k) ? 'pay' : /report/.test(k) || /sc:(mon|fri|month)/.test(t) ? 'report' : /approv|승인/.test(k + ((a && a.name) || '')) ? 'approval' : /due|마감|inactive/.test(k) ? 'due' : 'notice'; };
  { const base = cnExec; cnExec = (a, T) => { const acts = (a && a.actions) || []; const extra = acts.includes('slack') && !acts.includes('teams') && cnStatus('teams').st === CN_ST.on; const a2 = extra ? Object.assign({}, a, { actions: [...acts, 'teams'] }) : a;
      return base(a2, T).map(s => { if (s.act !== 'teams' || !s.ok) return s; const ev = evOf(a); const title = `${(a && a.name) || '자동화'} — 대상 ${T.length}건`;
        if (LV()) { api('POST', '/api/conn/teams/notify', { event: ev, title, text: `${(S.org && S.org.name) || ''} 디디쌤 자동화 알림입니다.` }).then(r => cnLog('teams', `${a.name} — 채널 ${r.queued || 0}곳에 보냄`, true)).catch(e => cnLog('teams', `${a.name} — ${(e && e.message) || '보내지 못함'}`, false)); s.msg = `Teams 채널에 알림(${EVK.find(x => x[0] === ev)[1]})${extra ? ' · Slack과 함께' : ''}`; }
        else { const t = loc(); const L = (t.channels || []).filter(c => (c.events || []).includes(ev)); t.runs.unshift({ at: kst(), ch: L.map(c => c.name).join(' · ') || '(구독 채널 없음)', title, demo: true }); t.runs = t.runs.slice(0, 10); s.msg = `Teams 채널 ${L.length}곳에 알림 · 시연${extra ? ' · Slack과 함께' : ''}`; }
        return s; }); }; }
  [{ k: 'approval-teams', n: '승인 요청 → Teams 채널 알림', tr: 'ev:join', cond: '승인 대기 가입 · 수강 신청', acts: ['teams', 'task'], ap: false, d: '승인이 필요한 가입 · 수강 신청이 들어오면 운영 채널(Teams)에 건수만 알리고 담당자 할 일을 만듭니다.' },
    { k: 'report-teams', n: '주간 리포트 → Teams 채널 알림', tr: 'sc:mon', cond: '매주 월요일', acts: ['report', 'teams'], ap: false, d: '매주 월요일 운영 리포트를 만들고 요약을 Teams 채널에 올립니다(학습자 이름 없이 집계만).' }
  ].forEach(T => { if (typeof CN_TPL === 'object' && !CN_TPL.some(x => x.k === T.k)) CN_TPL.push(T); });
  { const base = targets; targets = a => { const k = String((a && a.key) || ''); if (k === 'cn-approval-teams') { try { return (S.members || []).filter(m => m.grade === '승인 대기').map(m => m.id); } catch (e) { return []; } } if (k === 'cn-report-teams') return ['report']; return base(a); }; }

  /* 따라하기(가이드 센터): cn-teams */
  if (typeof GUIDES === 'object' && Array.isArray(GUIDES) && !GUIDES.some(g => g.id === 'cn-teams')) GUIDES.push({ id: 'cn-teams', cat: '외부 연결', role: 'admin', title: 'Microsoft Teams 연결하기', mins: 5, desc: '채널 알림(워크플로) → 조직 연결 → 회의 만들기 순서로 연결합니다.',
    steps: [{ t: '외부 연결 화면 열기', d: '운영 › 외부 연결의 Microsoft Teams 줄을 누릅니다. 정운영자만 연결할 수 있습니다.', go: 'conn', done: { visit: 'conn' } }, { t: 'Teams에서 워크플로 만들기', d: CN.teams.steps[0] + ' ' + CN.teams.steps[1], done: { manual: 1 } }, { t: '주소 붙여 넣고 시험', d: CN.teams.steps[2], go: 'conn', done: { inc: 'cn_teams' } }, { t: '조직 연결(선택)', d: CN.teams.steps[3], go: 'conn', done: { manual: 1 } }] });

  /* 수업: 라이브 항목 편집기 — 회의 링크 만들기(Zoom · Microsoft Teams 나란히) */
  const at2 = (v, add) => { const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(String(v || '')); if (!m) return null; const d = new Date(`${m[1]}T${m[2]}:00+09:00`); return new Date(d.getTime() + (add || 0) * 60e3); };
  const iso9 = d => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 19) + '+09:00';
  if (typeof edRender === 'function') { const base = edRender; edRender = (...a) => { base(...a); try { const b = document.getElementById('edBody'); if (!b || typeof ED === 'undefined' || !ED || !ED.it || ED.it.type !== 'live' || b.querySelector('.tm-mk')) return;
      const t = ED.it.teams; const zon = cnStatus('zoom').st === CN_ST.on, ton = cnStatus('teams').st === CN_ST.on;
      b.insertAdjacentHTML('beforeend', `<div class="tm-mk" role="group" aria-label="회의 링크 만들기"><span class="mini">회의 링크 만들기</span><button type="button" class="btn sm" data-act="tm-zoom">${typeof brandLogo === 'function' ? brandLogo('zoom', 18, 'Zoom') : ''} Zoom 회의</button><button type="button" class="btn sm ${ton ? 'ink' : ''}" data-act="tm-meet">${typeof brandLogo === 'function' ? brandLogo('teams', 18, 'Microsoft Teams') : ''} ${t ? 'Teams 회의 다시 만들기' : 'Teams 회의 만들기'}</button>${t ? '<button type="button" class="btn sm ghost" data-act="tm-mdel">Teams 회의 삭제</button>' : ''}<small class="mini">${t ? `Teams 회의 연결됨${t.demo ? '(시연 링크)' : ''}` : ton ? '일시 기준 90분 회의를 만들고 주소를 자동으로 넣습니다.' : zon ? '' : 'Zoom · Teams를 연결하면 링크가 자동으로 생깁니다.'}</small></div>`); if (LV() && !TM.v) pull(); if (OFF()) { const x = b.querySelector('[data-act=tm-meet]'); if (x) x.remove(); } } catch (e) { console.error('teams editor', e); } }; }
  /* 시연 회의 주소(/learner.html#live-demo)는 https 검사를 통과하지 못하므로 저장할 때만 잠시 바꿔 넣고 되돌린다 */
  if (typeof edSave === 'function') { const base = edSave; edSave = (...a) => { const it = typeof ED !== 'undefined' && ED && ED.it; const t = it && it.type === 'live' && it.teams && it.teams.demo && it.url === it.teams.joinUrl && /^\/learner\.html#/.test(it.url) ? it.url : '';
      if (!t) return base(...a); const id = it.id, c = ED.c; it.url = 'https://teams.microsoft.com/l/meetup-join/demo'; const r = base(...a); it.url = t; const sv = c && (c.curriculum || []).find(x => x.id === id); if (sv && sv.url === 'https://teams.microsoft.com/l/meetup-join/demo') { sv.url = t; save(); } return r; }; }
  const setUrl = u => { ED.it.url = u; const i = document.querySelector('#edBody [data-ed="url"]'); if (i) i.value = u; };
  ACT['tm-zoom'] = () => { if (cnStatus('zoom').st !== CN_ST.on) { toast('Zoom을 먼저 연결하십시오.', 'warn'); if (S.me.role === 'owner' && ACT['cn-open']) ACT['cn-open']({ dataset: { v: 'zoom' } }); return; } toast('Zoom 회의 자동 생성은 운영 서버 연결 후 열립니다. 지금은 Zoom 회의 주소를 직접 붙여 넣으십시오.', 'warn'); };
  ACT['tm-meet'] = async el => { if (typeof ED === 'undefined' || !ED || OFF()) return; if (cnStatus('teams').st !== CN_ST.on && !LV()) { toast('Microsoft Teams를 먼저 연결하십시오(시연 연결 가능).', 'warn'); return; }
    const s = at2(ED.it.at) || at2(`${addDays(today(), 1)}T19:00`); const e = new Date(s.getTime() + 90 * 60e3); const subject = `${(ED.c && ED.c.name) || '수업'} · ${ED.it.title || '라이브'}`.slice(0, 120);
    if (LV()) { el.disabled = true; try { if (ED.it.teams && ED.it.teams.mid) await api('DELETE', `/api/conn/teams/meetings/${encodeURIComponent(ED.it.teams.mid)}?doc=0`).catch(() => { });
        const r = await api('POST', '/api/conn/teams/meetings', { classId: ED.c.id, itemId: ED.it.id, subject, start: iso9(s), end: iso9(e), docLink: false });
        ED.it.teams = { mid: r.id, joinUrl: r.joinUrl, ...(r.mode === 'demo' ? { demo: true } : {}) }; setUrl(r.joinUrl); toast(r.mode === 'demo' ? 'Teams 시연 회의를 만들었습니다. 저장하면 학습자 「라이브 입장」에 연결됩니다.' : 'Teams 회의를 만들었습니다. 저장하면 학습자 「라이브 입장」에 연결됩니다.', 'ok'); }
      catch (x) { toast((x && x.message) || 'Teams 회의를 만들지 못했습니다.', 'bad'); } el.disabled = false; }
    else { const mid = 'tm_' + Math.random().toString(36).slice(2, 12); ED.it.teams = { mid, joinUrl: '/learner.html#live-demo', demo: true, local: true }; setUrl('/learner.html#live-demo'); toast('Teams 시연 회의를 만들었습니다(시연 링크). 저장하면 학습자 「라이브 입장」에 연결됩니다.', 'ok'); }
    const box = document.querySelector('#edBody .tm-mk'); if (box) box.remove(); edRender(); };
  ACT['tm-mdel'] = async () => { if (typeof ED === 'undefined' || !ED || !ED.it.teams) return; const t = ED.it.teams;
    if (LV() && t.mid) { try { await api('DELETE', `/api/conn/teams/meetings/${encodeURIComponent(t.mid)}?doc=0`); } catch (e) { toast((e && e.message) || '삭제하지 못했습니다.', 'bad'); return; } }
    if (ED.it.url === t.joinUrl) setUrl(''); delete ED.it.teams; toast('Teams 회의를 삭제했습니다. 저장하면 반영됩니다.'); const box = document.querySelector('#edBody .tm-mk'); if (box) box.remove(); edRender(); };

  /* 출석: Teams 출석 가져오기(제안 → 반영) */
  if (typeof AFTER === 'object' && AFTER.push) AFTER.push(() => { if (typeof CUR !== 'object' || CUR.tab !== 'class' || !UI.cls || typeof C !== 'function') return; const c = C(UI.cls); if (!c) return;
    document.querySelectorAll('[data-act="w2-satt"]').forEach(b => { const it = (c.curriculum || []).find(x => x.id === b.dataset.s); if (!it || !it.teams || b.parentElement.querySelector('[data-act="tm-att"]')) return; b.insertAdjacentHTML('afterend', ` <button class="btn sm ghost" data-act="tm-att" data-c="${esc(c.id)}" data-s="${esc(it.id)}">Teams 출석 가져오기</button>`); }); });
  const hash01 = s => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } return x / 4294967296; };
  function demoSync(c, it) { const s = at2(it.at) || new Date(); const att = +(it.attMin ?? (loc().md || {}).attMin ?? 10); const mid = (it.teams || {}).mid || it.id;
    return { mode: 'demo', unmatched: 0, matched: (c.learners || []).map(m => { const h = hash01(mid + m); const min = h < .12 ? 4 : Math.round(54 + h * 36); const late = h >= .12 && h < .25; return { lid: m, label: 'L-' + Math.floor(h * 65535).toString(16).padStart(4, '0'), minutes: min, firstJoin: new Date(s.getTime() + (late ? 15 : 2) * 60e3 + 9 * 3600e3).toISOString().slice(11, 16), suggest: min < att ? '결석' : late ? '지각' : '출석' }; }) }; }
  ACT['tm-att'] = async el => { const c = C(el.dataset.c); const it = c && (c.curriculum || []).find(x => x.id === el.dataset.s); if (!it || !it.teams) return; let r;
    if (LV() && it.teams.mid && !it.teams.local) { try { r = await api('POST', `/api/conn/teams/meetings/${encodeURIComponent(it.teams.mid)}/attendance/sync`); } catch (e) { toast((e && e.message) || '출석 보고서를 가져오지 못했습니다.', e && e.status === 404 ? 'warn' : 'bad'); return; } }
    else r = demoSync(c, it);
    const nm = mid => { const m = (S.members || []).find(x => x.id === mid); return m ? m.name : r.matched.find(x => x.lid === mid).label; };
    const rows = r.matched.map(x => `<tr><td>${esc(nm(x.lid))}</td><td>${x.minutes}분</td><td>${esc(x.firstJoin)}</td><td><select name="tma-${esc(x.lid)}" aria-label="${esc(nm(x.lid))} 출결">${['출석', '지각', '결석'].map(v => `<option ${v === x.suggest ? 'selected' : ''}>${v}</option>`).join('')}</select></td></tr>`).join('');
    modal('Teams 출석 가져오기', `<p class="mini">Teams 참석 보고서로 만든 <b>제안</b>입니다. 확인한 뒤 [반영]을 눌러야 출석부에 저장됩니다.${r.mode === 'demo' ? ' (시연 데이터)' : ''}</p>${r.matched.length ? `<div class="tblw"><table class="tbl"><thead><tr><th>학습자</th><th>참여</th><th>첫 입장</th><th>제안</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p>Microsoft 계정으로 로그인한 학습자와 맞춘 기록이 없습니다.</p>'}${r.unmatched ? `<p class="mini">확인 필요 ${r.unmatched}명 — 디디쌤에 Microsoft 계정을 연결하지 않은 참석자입니다(이름 · 이메일은 저장하지 않음).</p>` : ''}`,
      [{ id: 'c', label: '닫기' }, ...(r.matched.length ? [{ id: 'ok', label: `${r.matched.length}명 반영`, kind: 'pri', run: w => { let n = 0; r.matched.forEach(x => { const v = fv(w, 'tma-' + x.lid); if (!['출석', '지각', '결석'].includes(v)) return; if (typeof W2 === 'object' && W2.set) W2.set(c, it.id, x.lid, v, 'live'); else { c.att = c.att || {}; (c.att[it.id] = c.att[it.id] || {})[x.lid] = v; } n++; });
        logAudit(`Teams 출석 반영 — ${c.name} ${it.title || ''} ${n}명${r.mode === 'demo' ? '(시연)' : ''}`); save(); render(); toast(`출석 ${n}명을 반영했습니다.`, 'ok'); } }] : [])], true); };
})();
