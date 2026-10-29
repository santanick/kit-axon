/* 디디쌤 스튜디오 v8 — 고객(기관)별 데이터룸 분리 · 배포 모델 4종
   원칙: 기관 하나 = 데이터룸 하나. 데이터 · 파일 · 암호화 키 · AI 키/사용량 · 감사 로그 · 백업이 기관 단위로 나뉜다.
   배포 모델: 공유 SaaS(논리 분리) / 전용 클라우드(디디쌤 운영 전용 환경) / 고객 클라우드(기관 계정 GCP · AWS · NCP 등에 설치) / 설치형(기관 서버 · 폐쇄망).
   데모: 브라우저 저장소를 기관별 키(didisam.room.<테넌트 ID>)로 나누고, 데이터룸의 외부 연결 정책을 실제로 적용한다.
   운영: 같은 화면 코드가 데이터 포트(브라우저 → API)를 바꿔 끼우고, 서버는 deploy/ 참조 키트(이식형 스택)로 4가지 모델에 설치한다. */
'use strict';
Object.assign(IC, {
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  cloud: '<path d="M7 18h10.5a4 4 0 0 0 .6-8 6 6 0 0 0-11.6 1.4A3.4 3.4 0 0 0 7 18z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  server: '<rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/><path d="M8 7.5h.01M8 16.5h.01"/>',
  building: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3"/>'
});

/* ── 배포 모델 · 선택지 ── */
const DRM = {
  saas: { n: '공유 SaaS', ic: 'cloud', s: '디디쌤 클라우드 · 기관별 논리 분리', who: '학원 · 평생교육원 · 소규모 기관', where: '디디쌤 클라우드(서울 리전)', op: '디디쌤 운영', iso: '기관별 DB 스키마 + 행 수준 보안 + 기관별 암호화 키 + 파일 저장소 분리', p: { cloud: 'gcp', region: 'asia-northeast3', ai: 'anthropic', auth: 'didisam', kms: 'didisam', backup: 'daily30', egress: { ai: true, youtube: true, gcal: true, naver: true, tr: true, notify: true } } },
  dedicated: { n: '전용 클라우드', ic: 'building', s: '디디쌤이 운영하는 기관 전용 환경', who: '대학 · 중견기업', where: '디디쌤 클라우드 안 기관 전용 프로젝트 · DB · 저장소', op: '디디쌤 운영(전용 인스턴스)', iso: '기관 전용 DB 인스턴스 · 전용 프로젝트/VPC · 전용 암호화 키', p: { cloud: 'gcp', region: 'asia-northeast3', ai: 'anthropic', auth: 'oidc', kms: 'didisam', backup: 'daily90', egress: { ai: true, youtube: true, gcal: true, naver: true, tr: true, notify: true } } },
  byoc: { n: '고객 클라우드', ic: 'lock', s: '기관의 클라우드 계정에 설치(GCP · AWS · NCP 등)', who: '대기업 · 공공기관(CSAP 인증 클라우드)', where: '기관 소유 클라우드 계정', op: '기관 소유 · 디디쌤 위임 운영 또는 기관 직접 운영', iso: '기관 계정 안 DB · 저장소 · 고객 관리 키(CMEK) — 디디쌤 인프라와 물리 분리', p: { cloud: 'gcp', region: 'asia-northeast3', ai: 'vertex', auth: 'saml', kms: 'cmek', backup: 'daily90', egress: { ai: true, youtube: true, gcal: false, naver: false, tr: true, notify: false } } },
  onprem: { n: '설치형', ic: 'server', s: '기관 서버 · 폐쇄망에 컨테이너로 설치', who: '공공 · 국방 · 금융 · 망분리 기관', where: '기관 전산실 서버', op: '기관 운영 · 디디쌤 기술 지원(오프라인 업데이트 번들)', iso: '기관 망 안에서만 동작 · 외부 통신 기본 차단', p: { cloud: 'onprem', region: 'onprem', ai: 'local', auth: 'ldap', kms: 'hsm', backup: 'daily90', egress: { ai: false, youtube: false, gcal: false, naver: false, tr: false, notify: false } } }
};
const DRC = { gcp: ['Google Cloud', { 'asia-northeast3': '서울(asia-northeast3)', 'asia-northeast1': '도쿄(asia-northeast1)' }], aws: ['AWS', { 'ap-northeast-2': '서울(ap-northeast-2)' }], azure: ['Microsoft Azure', { koreacentral: '한국 중부(Korea Central)' }], ncp: ['네이버클라우드(공공)', { 'kr-gov': '공공 리전(KR)', kr: '일반 리전(KR)' }], ktc: ['KT Cloud(공공)', { 'kr-gov': '공공 리전(KR)', kr: '일반 리전(KR)' }], nhn: ['NHN Cloud(공공)', { 'kr-gov': '공공 리전(KR)', kr: '일반 리전(KR)' }], onprem: ['기관 서버(설치형)', { onprem: '기관 전산실' }] };
const DRA = { anthropic: 'Claude API(Anthropic 직접)', vertex: 'Claude on Google Vertex AI(기관 GCP 계정)', bedrock: 'Claude on Amazon Bedrock(기관 AWS 계정)', local: '기관 내부 LLM(OpenAI 호환 엔드포인트)', off: 'AI 끔(규칙 엔진만)' };
const DRAUTH = { didisam: '디디쌤 계정(이메일 · 비밀번호)', oidc: '기관 SSO — OIDC', saml: '기관 SSO — SAML 2.0', ldap: '기관 디렉터리 — LDAP/AD' };
const DRK = { didisam: '디디쌤 관리 키(기관별 분리)', cmek: '고객 관리 키(기관 KMS · CMEK)', hsm: '기관 HSM · 자체 키 관리' };
const DRB = { daily30: '매일 · 30일 보관 · 같은 리전', daily90: '매일 · 90일 보관 · 같은 리전', custom: '기관 백업 정책 따름' };
const DRE = [['ai', 'AI 호출(Claude 등 외부 LLM)'], ['youtube', 'YouTube 검색 · 재생'], ['gcal', 'Google 캘린더'], ['naver', '네이버 캘린더'], ['tr', '번역 · 음성 인식 API'], ['notify', '알림톡 · 메일 발송']];

/* ── 데이터룸 레지스트리(이 브라우저) ── */
const DREG = {
  K: 'didisam.rooms',
  get() { try { const r = JSON.parse(localStorage.getItem(this.K) || 'null'); return r && Array.isArray(r.list) ? r : { cur: null, list: [] }; } catch (e) { return { cur: null, list: [] }; } },
  put(r) { try { localStorage.setItem(this.K, JSON.stringify(r)); } catch (e) { } },
  cur() { return this.get().cur; },
  use(tid) { const r = this.get(); r.cur = tid; this.put(r); },
  upsert(e) { const r = this.get(); const i = r.list.findIndex(x => x.tid === e.tid); if (i < 0) r.list.push(e); else r.list[i] = { ...r.list[i], ...e }; this.put(r); },
  drop(tid) { const r = this.get(); r.list = r.list.filter(x => x.tid !== tid); if (r.cur === tid) r.cur = null; this.put(r); [roomKey(tid), roomKey(tid) + '.claude'].forEach(k => { try { localStorage.removeItem(k); } catch (e) { } }); }
};
const roomKey = tid => 'didisam.room.' + tid;
const newTid = () => { const a = new Uint8Array(5); crypto.getRandomValues(a); return 'tn_' + [...a].map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 8); };
const roomDefault = (tid, mode = 'saas') => ({ tid, mode, ...JSON.parse(JSON.stringify(DRM[mode].p)), created: today() });
const R = () => (S && S.org && S.org.room) || roomDefault(DREG.cur() || 'tn_demo');

/* 레거시(v7 이하: 브라우저 하나에 기관 하나) → 데이터룸으로 이전 */
(function migrate() {
  try {
    if (localStorage.getItem(DREG.K)) return;
    const old = localStorage.getItem(KEY); if (!old) return;
    const v = JSON.parse(old); if (!v || !v.org) return;
    const tid = newTid(); v.org.room = roomDefault(tid);
    localStorage.setItem(roomKey(tid), JSON.stringify(v));
    const cl = localStorage.getItem('didisam.claude'); if (cl) localStorage.setItem(roomKey(tid) + '.claude', cl);
    DREG.put({ cur: tid, list: [{ tid, name: v.org.name, type: v.org.type, mode: 'saas', at: today() }] });
    localStorage.removeItem(KEY); localStorage.removeItem('didisam.claude');
  } catch (e) { }
})();

/* ── 저장소: 현재 데이터룸 키로만 읽고 쓴다(다른 기관 데이터에 닿지 않음) ── */
Store.get = () => { const tid = DREG.cur(); if (!tid) return null; try { const v = JSON.parse(localStorage.getItem(roomKey(tid)) || 'null'); if (v && v.org && v.org.room && v.org.room.tid !== tid) return null; return v; } catch (e) { return null; } };
Store.clear = () => { const tid = DREG.cur(); if (tid) DREG.drop(tid); };
{ const write = (k, s) => localStorage.setItem(k, s);
  Store.set = v => {
    let tid = DREG.cur(); if (!tid) { tid = newTid(); DREG.use(tid); }
    if (v && v.org) { if (!v.org.room || v.org.room.tid !== tid) v.org.room = { ...roomDefault(tid), ...(v.org.room || {}), tid }; DREG.upsert({ tid, name: v.org.name, type: v.org.type, mode: v.org.room.mode, at: v.org.room.created }); }
    if (v) fixDeep(v); const k = roomKey(tid); let s = JSON.stringify(v);
    try { write(k, s); STQ.size = s.length; STQ.fail = false; if (s.length > STQ.LIMIT * 0.8) stWarn(`저장 공간을 ${Math.round(s.length / STQ.LIMIT * 100)}% 쓰고 있습니다. 설정 › 계정 · 데이터에서 내보내기 후 정리하세요.`, 'warn'); return; } catch (e) { }
    const n = compactState(v); s = JSON.stringify(v);
    try { write(k, s); STQ.size = s.length; STQ.fail = false; stWarn(`저장 공간이 가득 차 오래된 기록을 정리하고 저장했습니다(문서 이전 버전 ${n.vers} · 대화 ${n.chat} · 로그 ${n.runs + n.audit}).`, 'warn'); }
    catch (e) { STQ.fail = true; STQ.size = s.length; stWarn('저장하지 못했습니다 — 브라우저 저장 공간(약 5MB)이 가득 찼습니다. 큰 문서를 삭제하거나 설정 › 계정 · 데이터에서 내보낸 뒤 정리하세요. 지금 상태는 새로고침하면 사라집니다.', 'bad'); setTimeout(() => render(), 0); }
  }; }

/* Claude 키 · 사용량도 기관(데이터룸)별로 */
Object.defineProperty(CL, 'K', { get: () => roomKey(DREG.cur() || 'none') + '.claude' });

/* 새 기관 = 새 데이터룸 */
{ const base = createOrg; createOrg = (type, name) => { const tid = newTid(); DREG.use(tid); base(type, name); }; }
{ const base = upgradeState; upgradeState = (...a) => { const r = base(...a); if (S && S.org && (!S.org.room || !S.org.room.tid)) { S.org.room = roomDefault(DREG.cur() || newTid()); save(); } return r; }; }

/* ── 데이터룸 정책을 실제로 적용(외부 연결 차단 · AI 경로) ── */
const egressOK = k => { const r = R(); return !!(r.egress && r.egress[k]); };
const egressMsg = (what) => `이 기관의 데이터룸 정책(${DRM[R().mode].n})에서 ${what} 외부 연결이 꺼져 있습니다. 설정 › 계정 · 데이터 › 데이터룸 · 배포에서 바꿀 수 있습니다.`;
{ const base = CL.on.bind(CL); CL.on = (f = 'chat') => base(f) && R().ai === 'anthropic' && egressOK('ai'); }
{ const base = ytSearch; ytSearch = async q => { if (!egressOK('youtube')) { toast(egressMsg('YouTube'), 'warn'); return null; } return base(q); }; }
{ const base = loadGIS; loadGIS = () => egressOK('gcal') ? base() : Promise.reject(new Error(egressMsg('Google 캘린더'))); }

/* ── 설정 › 계정 · 데이터 › 데이터룸 · 배포 ── */
const drSel = (k, opts, v) => `<select data-chg="dr-set" data-k="${k}">${Object.entries(opts).map(([a, b]) => `<option value="${a}" ${a === v ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
function drIsoRows(r) {
  const m = r.mode; const cl = DRC[r.cloud] ? DRC[r.cloud][0] : '기관 서버';
  const op = {
    db: { saas: '공유 PostgreSQL 클러스터 안 기관 전용 스키마 + 행 수준 보안(tenant_id)', dedicated: '기관 전용 DB 인스턴스(Cloud SQL 등)', byoc: `${cl} 안 기관 소유 DB 인스턴스`, onprem: '기관 서버의 PostgreSQL(컨테이너 또는 기존 DB)' },
    file: { saas: '기관별 저장소 경로 + 기관 키 암호화', dedicated: '기관 전용 버킷', byoc: `${cl} 기관 버킷(GCS · S3 · NCP Object Storage)`, onprem: '기관 서버 MinIO(S3 호환) 또는 NAS' },
    key: { saas: '기관별 데이터 키(봉투 암호화) — 키 삭제로 데이터 파기', dedicated: '기관 전용 KMS 키', byoc: '기관 KMS 고객 관리 키(CMEK) — 디디쌤은 사용 권한만', onprem: '기관 HSM · 자체 키 관리' },
    ai: { saas: '기관별 AI 키 · 하루 한도 · 사용량 집계', dedicated: '기관별 AI 키 · 전용 한도', byoc: '기관 계정의 Vertex AI · Bedrock 또는 기관 키', onprem: '기관 내부 LLM 또는 AI 끔' },
    log: { saas: '기관별 감사 로그(위변조 방지 저장)', dedicated: '기관 전용 로그 저장소', byoc: '기관 클라우드 로깅으로 전송', onprem: '기관 SIEM · syslog로 전송' },
    bak: { saas: '기관 단위 백업 · 기관 단위 복구', dedicated: '전용 백업 · 기관 단위 복구', byoc: '기관 계정 안 백업(기관 정책)', onprem: '기관 백업 체계' },
    auth: { saas: '기관별 사용자 풀 · 하위 도메인', dedicated: '기관 SSO 연동 · 전용 도메인', byoc: '기관 SSO(SAML · OIDC) · 기관 도메인', onprem: '기관 디렉터리(LDAP/AD) · 내부 도메인' }
  };
  const tid = r.tid;
  return [['데이터베이스', `<code>${esc(roomKey(tid))}</code>`, op.db[m]], ['파일 · 영상 · 문서', '같은 키 안(데모는 원본 파일을 저장하지 않음)', op.file[m]], ['암호화 키', '—', op.key[m]], ['AI 키 · 사용량', `<code>${esc(roomKey(tid))}.claude</code>`, op.ai[m]], ['감사 로그', '기관 상태 안 audit', op.log[m]], ['백업 · 복구', '전체 JSON 내보내기', op.bak[m]], ['로그인 · 도메인', '데모 계정', op.auth[m]]];
}
function drChecklist(r) {
  const c = { saas: ['기관 하위 도메인(예: 기관.didisam.com)', '운영자 계정 · 권한', '개인정보 처리 위탁 계약'], dedicated: ['전용 도메인 · 인증서', '기관 SSO 메타데이터(OIDC/SAML)', '백업 보관 기간 · 복구 목표(RPO/RTO)', '개인정보 처리 위탁 계약'], byoc: ['기관 클라우드 계정 · 프로젝트(또는 구독)와 결제 주체', '디디쌤 위임 운영 권한(IAM 역할) — 기관 직접 운영 시 생략', 'VPC · 서브넷 · 방화벽 규칙', '고객 관리 키(KMS) 리소스', 'AI 경로: Vertex AI · Bedrock에서 Claude 모델 사용 승인과 리전 확인', '기관 SSO 메타데이터 · 도메인 · 인증서', '공공기관: CSAP 인증 클라우드 여부'], onprem: ['서버 사양(아래 설치 가이드) · OS · 컨테이너 런타임(Docker 또는 Kubernetes)', '내부 도메인 · 인증서', 'LDAP/AD 또는 SAML 연동 정보', '내부 LLM 사용 여부(GPU 서버) — 없으면 AI 끔', '오프라인 업데이트 반입 절차(망 연계)', '보안 점검 · 보안성 검토 일정(기관 절차)'] };
  return c[r.mode];
}
function roomView() {
  const r = R(); const m = DRM[r.mode]; const reg = DREG.get();
  const regions = DRC[r.cloud] ? DRC[r.cloud][1] : {};
  const clouds = Object.fromEntries(Object.entries(DRC).filter(([k]) => r.mode === 'onprem' ? k === 'onprem' : k !== 'onprem').map(([k, v]) => [k, v[0]]));
  const ais = r.mode === 'onprem' ? { local: DRA.local, off: DRA.off } : DRA;
  return `<div class="card drhead"><div class="ch"><b>이 기관의 데이터룸</b><span class="tag g">분리됨</span><small>기관 하나 = 데이터룸 하나 — 다른 기관과 데이터 · 파일 · 키 · AI 사용량 · 로그를 공유하지 않습니다.</small></div>
    <div class="drid"><div><small>테넌트 ID</small><code>${esc(r.tid)}</code></div><div><small>기관</small><b>${esc(S.org.name)}</b></div><div><small>배포 모델</small><b>${esc(m.n)}</b></div><div><small>데이터 위치</small><b>${esc(DRC[r.cloud] ? DRC[r.cloud][0] : '')} · ${esc(regions[r.region] || r.region)}</b></div></div>
    <div class="bar2"><button class="btn pri" data-act="dr-yaml">${ic('server', 16)} 설치 구성 파일(YAML) 내려받기</button><button class="btn" data-act="data-export">데이터룸 내보내기(JSON)</button><a class="btn" href="deploy/" target="_blank" rel="noopener">설치 가이드</a><button class="btn redl" data-act="reset-all">이 데이터룸 파기</button></div></div>
  <div class="card"><div class="ch"><b>배포 모델</b><small>기관의 보안 요건에 맞춰 고릅니다. 같은 프로그램이 네 가지 방식으로 설치됩니다.</small></div>
    <div class="drm">${Object.entries(DRM).map(([k, d]) => `<button type="button" class="tcard ${k === r.mode ? 'on' : ''}" data-act="dr-mode" data-v="${k}" aria-pressed="${k === r.mode}"><span class="ti">${ic(d.ic, 22)}</span><b>${esc(d.n)}</b><p>${esc(d.s)}</p><small><em>대상</em> ${esc(d.who)}</small><small><em>데이터</em> ${esc(d.where)}</small><small><em>운영</em> ${esc(d.op)}</small><small><em>격리</em> ${esc(d.iso)}</small></button>`).join('')}</div></div>
  <div class="card"><div class="ch"><b>세부 구성</b><small>${esc(m.n)} 기준 기본값 · 바꾸면 바로 저장</small></div>
    <div class="form2"><label>클라우드${drSel('cloud', clouds, r.cloud)}</label><label>리전${drSel('region', regions, r.region)}</label><label>AI 경로${drSel('ai', ais, r.ai)}</label><label>로그인${drSel('auth', DRAUTH, r.auth)}</label><label>암호화 키${drSel('kms', DRK, r.kms)}</label><label>백업${drSel('backup', DRB, r.backup)}</label></div>
    <p class="fl0"><b>외부 연결 허용</b> <small class="mini">끄면 이 데모에서도 실제로 막힙니다(AI · YouTube · Google 캘린더).</small></p>
    <div class="drx">${DRE.map(([k, l]) => `<label class="ckl"><input type="checkbox" data-chg="dr-eg" data-k="${k}" ${r.egress?.[k] ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div>
    ${r.ai !== 'anthropic' ? `<p class="mini drnote">AI 경로가 「${esc(DRA[r.ai])}」이면 운영 서버가 그 경로로 호출합니다. 이 데모는 브라우저에서 Anthropic만 직접 부를 수 있으므로 AI SAM은 규칙 엔진으로 동작합니다.</p>` : ''}</div>
  <div class="card"><div class="ch"><b>무엇이 분리되나</b><small>데모(이 브라우저)와 운영(${esc(m.n)})</small></div>${table(['항목', '이 데모', '운영'], drIsoRows(r).map(([a, b, c]) => [`<b>${esc(a)}</b>`, b, esc(c)]))}</div>
  <div class="card"><div class="ch"><b>설치 전 준비할 것</b><small>${esc(m.n)}</small></div><ul class="drck">${drChecklist(r).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
  <div class="card"><div class="ch"><b>이 브라우저의 데이터룸</b><small>기관마다 따로 저장됩니다 · 전환해도 서로 섞이지 않습니다</small><button class="btn sm" data-act="dr-new">+ 새 기관 데이터룸</button></div>
    ${table(['기관', '유형', '배포 모델', '테넌트 ID', '생성일', ''], reg.list.map(x => [`<b>${esc(x.name || '')}</b>${x.tid === reg.cur ? ' <span class="tag mg">지금</span>' : ''}`, esc(TYPES[x.type]?.name || ''), esc(DRM[x.mode]?.n || ''), `<code>${esc(x.tid)}</code>`, esc(x.at || ''), x.tid === reg.cur ? '' : `<button class="btn sm" data-act="dr-switch" data-v="${esc(x.tid)}">전환</button> <button class="btn sm redl" data-act="dr-drop" data-v="${esc(x.tid)}">파기</button>`]))}</div>`;
}
{ const base = VIEWS.settings; VIEWS.settings = () => { const h = base(); return UI.settings === 'room' && S.me.role === 'owner' ? h + roomView() : h; }; }

ACT['dr-mode'] = el => { const k = el.dataset.v; const r = R(); if (k === r.mode) return;
  modal('배포 모델 변경', `<p><b>${esc(DRM[k].n)}</b>으로 바꾸면 클라우드 · AI 경로 · 로그인 · 암호화 키 · 외부 연결이 이 모델의 기본값으로 바뀝니다.</p><p class="mini">${esc(DRM[k].iso)}</p><p class="mini">데모 데이터는 그대로 이 데이터룸에 남습니다. 운영에서는 데이터룸을 새 환경으로 옮기는 이전 작업(내보내기 → 설치 → 가져오기)이 필요합니다.</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '변경', kind: 'pri', run: () => { S.org.room = { ...r, ...JSON.parse(JSON.stringify(DRM[k].p)), mode: k }; logAudit(`데이터룸 배포 모델 변경 — ${DRM[k].n}`); save(); render(); toast(`${DRM[k].n} 구성으로 바꿨습니다.`, 'ok'); } }]); };
ACT['dr-set'] = el => { const r = S.org.room; const k = el.dataset.k; r[k] = el.value;
  if (k === 'cloud') r.region = Object.keys(DRC[r.cloud][1])[0];
  if (k === 'ai') r.egress.ai = r.ai !== 'off' && r.ai !== 'local' ? r.egress.ai : r.ai === 'local';
  logAudit(`데이터룸 구성 변경 — ${k}=${el.value}`); save(); render(); toast('데이터룸 구성을 저장했습니다.', 'ok'); };
ACT['dr-eg'] = el => { S.org.room.egress[el.dataset.k] = el.checked; logAudit(`외부 연결 ${el.checked ? '허용' : '차단'} — ${el.dataset.k}`); save(); render(); toast(el.checked ? '외부 연결을 허용했습니다.' : '외부 연결을 차단했습니다.', 'ok'); };
const drSwitch = tid => { closeModal && closeModal(); $('#drawer') && $('#drawer').remove(); document.body.classList.remove('drawer-open'); DREG.use(tid); S = Store.get(); if (S && typeof upgradeState === 'function') upgradeState(); CUR = { ws: 'home', tab: '' }; history.replaceState(null, '', location.pathname); render(); };
ACT['dr-switch'] = el => { const tid = el.dataset.v; const e = DREG.get().list.find(x => x.tid === tid); if (!e) return; drSwitch(tid); toast(`「${e.name}」 데이터룸으로 전환했습니다.`, 'ok'); };
ACT['dr-new'] = () => { $('#drawer') && $('#drawer').remove(); document.body.classList.remove('drawer-open'); DREG.use(null); S = null; SU = { step: 1, type: '', name: '', email: '' }; history.replaceState(null, '', location.pathname); render(); };
ACT['dr-drop'] = el => { const tid = el.dataset.v; const e = DREG.get().list.find(x => x.tid === tid); if (!e) return;
  modal('데이터룸 파기', `<p><b>${esc(e.name)}</b>(<code>${esc(tid)}</code>)의 데이터 · AI 키 · 사용량을 이 브라우저에서 모두 지웁니다. 되돌릴 수 없습니다.</p><p class="mini">운영에서는 기관 암호화 키를 폐기해 백업까지 복구할 수 없게 하는 방식(암호화 삭제)으로 파기하고 파기 확인서를 남깁니다.</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '파기', kind: 'red', run: () => { DREG.drop(tid); logAudit(`다른 데이터룸 파기 — ${e.name}(${tid})`); save(); render(); toast('파기했습니다.', 'ok'); } }]); };
ACT['reset-all'] = () => { const tid = DREG.cur();
  modal('이 데이터룸 파기', `<p><b>${esc(S.org.name)}</b>(<code>${esc(tid)}</code>)의 데이터 · AI 키 · 사용량을 이 브라우저에서 모두 지우고 가입 화면으로 돌아갑니다. 다른 기관의 데이터룸은 그대로입니다.</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '파기', kind: 'red', run: () => { Store.clear(); S = null; SU = { step: 1, type: '', name: '', email: '' }; history.replaceState(null, '', location.pathname); render(); } }]); };
ACT['data-export'] = () => { const r = R(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ format: 'didisam-dataroom/1', tenant: r.tid, exportedAt: new Date().toISOString(), data: S }, null, 1)], { type: 'application/json' })); a.download = `didisam_${r.tid}_${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); logAudit('데이터룸 내보내기'); save(); };

/* 설치 구성 파일(tenant.yaml) — deploy/ 참조 키트가 읽는 형식 */
const yq = v => JSON.stringify(String(v ?? ''));
function tenantYAML() {
  const r = R(); const o = S.org; const sub = (o.domain || '').split('.')[0] || r.tid;
  const dom = { saas: `${sub}.didisam.com`, dedicated: `${sub}.didisam.com  # 또는 기관 도메인`, byoc: 'lms.<기관 도메인>', onprem: 'lms.<기관 내부 도메인>' }[r.mode];
  const st = { gcp: 'gcs', aws: 's3', azure: 'azure-blob', ncp: 's3-compatible', ktc: 's3-compatible', nhn: 's3-compatible', onprem: 'minio' }[r.cloud] || 'minio';
  const iso = { saas: 'schema-per-tenant', dedicated: 'database-per-tenant', byoc: 'database-per-tenant', onprem: 'database-per-tenant' }[r.mode];
  const aiEp = { anthropic: 'https://api.anthropic.com', vertex: `vertex-ai:${r.cloud === 'gcp' ? r.region : 'asia-northeast3'}  # 모델 리전 가용성 확인`, bedrock: 'bedrock:ap-northeast-2  # 모델 리전 가용성 확인', local: 'http://llm.internal:8000/v1  # OpenAI 호환', off: '' }[r.ai];
  const L = [
    `# 디디쌤 스튜디오 테넌트 구성 — ${o.name} (${r.tid})`, `# 생성: ${nowStr()} · deploy/README.md의 절차로 설치합니다. <...>는 기관이 채울 값입니다.`, 'apiVersion: didisam.com/v1', 'kind: Tenant',
    'tenant:', `  id: ${r.tid}`, `  name: ${yq(o.name)}`, `  type: ${o.type}            # ${TYPES[o.type].name}`, `  privacy: ${o.type === 'univ' ? 'student-id-only   # 학번 · 학과만 저장' : 'minimal'}`,
    'deploy:', `  mode: ${r.mode}            # saas | dedicated | byoc | onprem — ${DRM[r.mode].n}`, `  cloud: ${r.cloud}`, `  region: ${r.region}`, `  domain: ${dom}`, `  operator: ${r.mode === 'byoc' ? 'customer-or-delegated' : r.mode === 'onprem' ? 'customer' : 'didisam'}`,
    'data:', `  database: { engine: postgresql, version: "16", isolation: ${iso}, name: ${yq('didisam_' + r.tid)} }`, `  objectStorage: { engine: ${st}, bucket: ${yq('didisam-' + r.tid.replace('_', '-'))} }`,
    `  encryption: { atRest: aes-256, keyManagement: ${r.kms}${r.kms === 'cmek' ? ', keyRef: "<기관 KMS 키 리소스 ID>"' : r.kms === 'hsm' ? ', keyRef: "<기관 HSM 키 라벨>"' : ''}, perTenantDataKey: true }`,
    `  backup: { policy: ${r.backup}, location: same-region }`, '  residency: KR',
    'auth:', `  mode: ${r.auth}${r.auth === 'oidc' ? '\n  issuer: "<기관 IdP issuer URL>"\n  clientId: "<클라이언트 ID>"' : r.auth === 'saml' ? '\n  metadataUrl: "<기관 IdP 메타데이터 URL>"' : r.auth === 'ldap' ? '\n  url: "ldaps://<기관 디렉터리>:636"\n  baseDN: "<DN>"' : ''}`,
    'ai:', `  route: ${r.ai}             # ${DRA[r.ai]}`, ...(r.ai === 'off' ? [] : [`  model: ${(CL.get().model || 'claude-haiku-5-5')}`, `  endpoint: ${aiEp}`, '  secretRef: "ai-credentials"   # 키는 비밀값 저장소에만', '  dailyLimitPerAdmin: 200', '  sendPersonalData: false      # 이름 · 학번 대신 내부 ID · 집계만']),
    'egress:', ...DRE.map(([k]) => `  ${k}: ${!!r.egress[k]}`),
    'audit:', `  sink: ${r.mode === 'onprem' ? 'syslog   # 기관 SIEM' : r.mode === 'byoc' ? 'cloud-logging   # 기관 계정' : 'didisam-audit'}`, '  retentionDays: 365'
  ];
  return L.join('\n') + '\n';
}
ACT['dr-yaml'] = () => { const r = R(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([tenantYAML()], { type: 'text/yaml' })); a.download = `didisam-tenant-${r.tid}.yaml`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); logAudit('설치 구성 파일 내려받기'); save(); toast('설치 구성 파일을 내려받았습니다.', 'ok'); };

/* 사이드바 기관 카드에 데이터룸 표시 · 가입 화면에 기존 데이터룸 */
AFTER.push(() => { const c = $('.orgcard small'); if (c && S?.org?.room) c.textContent = `${DRM[S.org.room.mode].n} · 데이터룸 분리`; });
{ const base = renderSignup; renderSignup = (...a) => { base(...a); const L = DREG.get().list; if (!L.length) return; const f = $('#suForm'); f && f.insertAdjacentHTML('afterend', `<div class="drback"><b>이 브라우저의 다른 기관 데이터룸</b><div>${L.map(x => `<button type="button" class="btn sm" data-act="dr-switch" data-v="${esc(x.tid)}">${esc(x.name)} <small>${esc(DRM[x.mode]?.n || '')}</small></button>`).join('')}</div></div>`); }; }

/* 대화 · 이동 */
Object.assign(DICT, { '데이터룸 · 배포': 'Data room · Deployment|データルーム · 配備|数据室 · 部署|資料室 · 部署|Phòng dữ liệu · Triển khai|ห้องข้อมูล · การติดตั้ง|Ruang data · Penerapan|Sala de datos · Despliegue|Salle de données · Déploiement' });
if (typeof COVER !== 'undefined' && Array.isArray(COVER)) COVER.push(['[신규] 데이터룸 · 배포: 기관별 데이터 분리 · 공유 SaaS · 전용 클라우드 · 고객 클라우드 · 설치형', 'settings', '']);
{ const base = answer; answer = q => { if (/데이터\s*룸|배포\s*(모델|방식)|설치형|온프레미스|프라이빗\s*클라우드|폐쇄망|고객\s*클라우드/i.test(q) && !/만들|생성|발송|보내/.test(q)) { UI.settings = 'room'; const r = R();
      return { text: `이 기관의 데이터룸은 ${DRM[r.mode].n} 모델(${DRC[r.cloud]?.[0] || ''} · ${(DRC[r.cloud]?.[1] || {})[r.region] || r.region})로 구성되어 있습니다. 기관마다 데이터 · 파일 · 암호화 키 · AI 사용량 · 로그가 분리되며, 공유 SaaS · 전용 클라우드 · 고객 클라우드 · 설치형 중에서 바꿀 수 있습니다.`, go: 'settings' }; }
    return base(q); }; }
