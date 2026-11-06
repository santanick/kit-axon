/* v32 강의 영상 관리 — 자체 CMS · 스트리밍 · 강의 녹화 · AI 자동자막(ECR-002 · SFR-062 · ECR-003 · SFR-073)
   운영: /api/lms/v/... (서버가 ffmpeg로 HLS 360p · 720p 변환 → 서명 · 만료 재생 주소 → 묶음 I 플레이어 · 진도 · 자동출석, 묶음 B 차시 자원에 자동 배치)
   데모(서버 없음): 같은 경로를 W3.LOCAL이 흉내 낸다 — 올린 · 녹화한 영상은 이 브라우저에서만 재생(변환 · 자막은 몇 초 뒤 끝난 것으로 표시).
   화면: 지금 할 일 + 탭 4개(영상 · 녹화하기 · 자막 · 전송 설정), 주 버튼 「영상 올리기」. 메뉴는 「수업 › 강의실」 안(LMSNAV.G에 끼운다 — nav.js는 고치지 않음). */
(function () {
  'use strict';
  if (!window.W3) return;
  const W3 = window.W3; const L = W3.LOCAL; const D = () => W3.D(); const now = () => Date.now();
  const ULMS_ = () => typeof ULMS === 'function' && ULMS();
  const DM = window.DDMEDIA = window.DDMEDIA || { blobs: {} }; DM.blobs = DM.blobs || {};
  const LANGS = { ko: '한국어', en: '영어', ja: '일본어', zh: '중국어', vi: '베트남어', uz: '우즈베크어', mn: '몽골어', ru: '러시아어', es: '스페인어', fr: '프랑스어', de: '독일어', id: '인도네시아어', th: '태국어', ne: '네팔어' };
  const ST_N = { uploading: '올리는 중', queued: '변환 대기', processing: '변환 중', ready: '재생 가능', failed: '변환 실패' };
  const mmss = x => { x = Math.max(0, Math.round(+x || 0)); const h = Math.floor(x / 3600); return (h ? h + ':' + String(Math.floor(x % 3600 / 60)).padStart(2, '0') : Math.floor(x / 60)) + ':' + String(x % 60).padStart(2, '0'); };
  const mb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.ceil(n / 1024) + 'KB';
  const fmtT = x => { const h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60), s = Math.floor(x % 60), ms = Math.round((x % 1) * 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`; };
  const toVTT = cues => 'WEBVTT\n\n' + cues.map(c => `${fmtT(c.s)} --> ${fmtT(c.e)}\n${c.t}`).join('\n\n') + '\n';
  const CHUNK = 1048576;

  /* ═════════ 데모 경로(서버와 같은 응답 모양) ═════════ */
  const DS = () => { const d = D(); d.media = d.media || []; d.mcaps = d.mcaps || {}; d.mlog = d.mlog || []; d.mset = d.mset || { delivery: 'origin', cdn_base: null, ttl_sec: 3600, domains: [], stt_lang: 'ko', targets: ['en', 'zh', 'ja', 'vi'], retain_days: 365 }; return d; };
  const setJ = () => Object.assign({}, DS().mset, { langs: Object.keys(LANGS), renditions: [{ name: '360p', height: 360, kbps: 800 }, { name: '720p', height: 720, kbps: 2500 }], storage_hint: 'db(기본) · disk(MEDIA_DIR) · gcs(운영: MEDIA_STORE=gcs, MEDIA_GCS_BUCKET)' });
  const mOf = id => { const m = DS().media.find(x => x.media_id === id && x.status !== 'deleted'); if (!m) { const e = new Error('없는 영상입니다.'); e.code = 'media'; throw e; } tickDemo(m); return m; };
  const bad = (msg, code) => { const e = new Error(msg); e.code = code || 'bad_input'; return e; };
  const dlog = (m, a) => DS().mlog.unshift({ media_id: m.media_id, actor: (S.me && S.me.name) || '교수자', action: a, ip: '10.0.0.*', at: W3.ts(now()) });
  const places = m => D().contents.filter(c => c.src === 'media:' + m.media_id).map(c => { const s = D().sessions.find(x => x.session_id === c.session_id) || {}; const sc = D().sections.find(x => x.section_id === s.section_id) || {}; return { content_id: c.content_id, section_id: s.section_id, section_title: sc.title, week_no: s.week_no, seq: s.seq, title: c.title }; });
  const capsOf = m => Object.entries(DS().mcaps).filter(([k]) => k.startsWith(m.media_id + '|')).map(([k, v]) => ({ lang: k.split('|')[1], ...v })).sort((a, b) => a.lang < b.lang ? -1 : 1);
  const demoCues = dur => { const o = []; for (let g = 0; g * 6 < Math.max(dur, 1) && g < 600; g++) o.push({ s: g * 6, e: Math.min(g * 6 + 5.5, Math.max(dur, 1)), t: `[데모 자막 ${g + 1}] 음성 인식 엔진이 설치되지 않은 환경의 예시입니다. 실제 음성 내용이 아니므로 편집하거나 엔진을 연결한 뒤 다시 만드세요.` }); return o; };
  function placeDo(m, ses, ttl) {
    const s = D().sessions.find(x => x.session_id === ses); if (!s) throw bad('없는 차시입니다.', 'session');
    let c = D().contents.find(x => x.session_id === ses && x.src === 'media:' + m.media_id); const dur = Math.max(1, Math.ceil(m.duration_sec || 1));
    if (!c) { c = { content_id: W3.uid(), session_id: ses, title: (ttl || m.title).slice(0, 120), duration_sec: dur, src: 'media:' + m.media_id, qualities: ['auto', ...m.renditions.map(r => r.name)], check_at_sec: Math.floor(dur * 0.8) }; D().contents.push(c); }
    capsOf(m).filter(x => x.status === 'published').forEach(x => { D().subs[c.content_id + '|' + x.lang] = { format: 'vtt', cues: x.cues, updated_at: W3.ts(now()) }; });
    return { content_id: c.content_id, res_id: null, section_id: s.section_id, session_id: ses, week_no: s.week_no, seq: s.seq, section_title: (D().sections.find(x => x.section_id === s.section_id) || {}).title, title: c.title };
  }
  /* 데모 변환 · 자막: 시작 뒤 6초 · 3초가 지나면 끝난 것으로 */
  function tickDemo(m) {
    const j = m.job; if (!j || !['queued', 'running'].includes(j.status)) return;
    const el = now() - Date.parse(j.created_at);
    if (j.kind === 'transcode') {
      if (el < 6000) { j.status = 'running'; j.progress = m.progress = Math.min(95, Math.round(el / 60)); j.step = 'HLS 변환(360p · 720p)'; m.status = 'processing'; return; }
      Object.assign(j, { status: 'done', progress: 100, step: '완료', finished_at: W3.ts(now()) }); Object.assign(m, { status: 'ready', progress: 100, ready_at: W3.ts(now()), renditions: [{ name: '360p', height: 360, kbps: 800 }, { name: '720p', height: 720, kbps: 2500 }], has_audio: true, width: 1280, height: 720 });
      m.jobs.unshift(j); if (m.place_session) try { placeDo(m, m.place_session, m.place_title); } catch (e) { }
      if (m.stt_auto) m.job = { job_id: W3.uid(), kind: 'stt', status: 'queued', progress: 0, step: '대기', lang: m.stt_lang || 'ko', engine: null, error: null, attempts: 0, created_at: W3.ts(now()) };
      else m.job = j; return;
    }
    if (el < 3000) { j.status = 'running'; j.progress = Math.round(el / 30); j.step = '음성 인식'; return; }
    Object.assign(j, { status: 'done', progress: 100, step: '완료', engine: 'demo', finished_at: W3.ts(now()) }); m.jobs.unshift(j);
    DS().mcaps[m.media_id + '|' + j.lang] = { cues: demoCues(m.duration_sec || 30), source: 'demo', engine: 'demo', status: 'draft', updated_at: W3.ts(now()), published_at: null };
  }
  const mJ = m => ({ media_id: m.media_id, title: m.title, kind: m.kind, status: m.status, progress: m.progress || 0, error: m.error || null, src_name: m.src_name, src_mime: m.src_mime, src_size: m.src_size, chunk_size: CHUNK, chunks: m.chunks,
    received: m.received || 0, trim_start: m.trim_start ?? null, trim_end: m.trim_end ?? null, duration_sec: m.duration_sec ?? null, width: m.width || null, height: m.height || null, has_audio: m.has_audio ?? null, renditions: m.renditions || [], storage: 'db',
    url_ver: m.url_ver || 1, access: m.access || 'enrolled', domains: m.domains || [], consent: m.consent || null, retain_until: m.retain_until, stt_auto: !!m.stt_auto, stt_lang: m.stt_lang, place_session: m.place_session || null,
    placements: places(m).length, captions: capsOf(m).map(c => ({ lang: c.lang, status: c.status, source: c.source })), job: m.job || null, created_at: m.created_at, ready_at: m.ready_at || null });
  function seedV() {
    const d = DS(); if (d.mseeded) return; d.mseeded = 1; const sec = d.sections[0]; if (!sec) return;
    const ses = d.sessions.filter(s => s.section_id === sec.section_id && s.kind === 'online').sort((a, b) => a.week_no - b.week_no);
    const t0 = now() - 3 * 864e5; const R = [{ name: '360p', height: 360, kbps: 800 }, { name: '720p', height: 720, kbps: 2500 }];
    const base = { kind: 'upload', status: 'ready', progress: 100, src_mime: 'video/mp4', chunks: 1, renditions: R, has_audio: true, width: 1280, height: 720, access: 'enrolled', domains: [], url_ver: 1, retain_until: new Date(now() + 365 * 864e5).toISOString().slice(0, 10), jobs: [] };
    const a = Object.assign({}, base, { media_id: W3.uid(), title: '3차시 온라인 강의 — 데이터 시각화', src_name: 'week3.mp4', src_size: 412 * 1048576, duration_sec: 1520, created_at: W3.ts(t0), ready_at: W3.ts(t0 + 9e5), stt_lang: 'ko',
      job: { job_id: W3.uid(), kind: 'stt', status: 'done', progress: 100, step: '완료', lang: 'ko', engine: 'whisper', error: null, attempts: 1, created_at: W3.ts(t0 + 9e5), finished_at: W3.ts(t0 + 12e5) } });
    const b = Object.assign({}, base, { media_id: W3.uid(), title: '실습 화면 녹화 — 파이썬 설치', kind: 'record', src_name: '녹화.webm', src_mime: 'video/webm', src_size: 96 * 1048576, duration_sec: 640, created_at: W3.ts(t0 + 864e5), ready_at: W3.ts(t0 + 864e5 + 3e5), stt_lang: 'ko',
      consent: { at: W3.ts(t0 + 864e5), by: '교수자', ver: 'rec-v1', items: ['screen', 'mic'] }, job: { job_id: W3.uid(), kind: 'transcode', status: 'done', progress: 100, step: '완료', lang: null, engine: 'ffmpeg', error: null, attempts: 1, created_at: W3.ts(t0 + 864e5), finished_at: W3.ts(t0 + 864e5 + 3e5) } });
    d.media.push(a, b);
    const ko = [['안녕하세요. 3차시 온라인 강의를 시작하겠습니다.', 0.5, 4], ['오늘은 데이터를 그림으로 나타내는 시각화를 배웁니다.', 4.5, 9], ['먼저 막대그래프와 선그래프의 차이를 살펴보겠습니다.', 9.5, 15], ['막대그래프는 항목끼리 크기를 비교할 때 씁니다.', 15.5, 20], ['선그래프는 시간에 따른 변화를 볼 때 알맞습니다.', 20.5, 26]].map(([t, s, e]) => ({ s, e, t }));
    d.mcaps[a.media_id + '|ko'] = { cues: ko, source: 'stt', engine: 'whisper', status: 'published', updated_at: W3.ts(t0 + 12e5), published_at: W3.ts(t0 + 13e5) };
    d.mcaps[a.media_id + '|en'] = { cues: [{ s: 0.5, e: 4, t: "Hello. Let's begin the week 3 online lecture." }, { s: 4.5, e: 9, t: 'Today we learn data visualization.' }], source: 'translate', engine: 'claude', status: 'draft', updated_at: W3.ts(t0 + 14e5), published_at: null };
    if (ses[0]) placeDo(a, ses[0].session_id, a.title);
    [['create', a, t0], ['upload', a, t0 + 6e4], ['caption:ko', a, t0 + 13e5], ['url', a, t0 + 2 * 864e5], ['play', a, t0 + 2 * 864e5 + 1e3], ['create', b, t0 + 864e5]].forEach(([x, m, t]) => d.mlog.push({ media_id: m.media_id, actor: x === 'play' || x === 'url' ? 'learner:20269001' : '교수자', action: x, ip: '10.20.1.*', at: W3.ts(t) }));
  }
  L['GET /api/lms/v/settings'] = () => setJ();
  L['POST /api/lms/v/settings'] = b => { const s = DS().mset; if (b.delivery && !['origin', 'cdn'].includes(b.delivery)) throw bad('전송 위치가 올바르지 않습니다.');
    if ('cdn_base' in b) { const v = String(b.cdn_base || '').trim(); if (v && !/^https:\/\/[a-z0-9.-]+(:\d+)?(\/[A-Za-z0-9._~/-]*)?$/.test(v)) throw bad('CDN 주소는 https://로 시작하는 주소여야 합니다.', 'cdn_base'); s.cdn_base = v ? v.replace(/\/+$/, '') : null; }
    const dl = b.delivery || s.delivery; if (dl === 'cdn' && !s.cdn_base) throw bad('CDN으로 전환하려면 CDN 주소를 먼저 입력하세요.', 'cdn_base'); s.delivery = dl;
    if (b.ttl_sec != null) { if (!(+b.ttl_sec >= 60 && +b.ttl_sec <= 86400)) throw bad('재생 주소 유효 시간은 60~86400초입니다.'); s.ttl_sec = +b.ttl_sec; }
    if (b.retain_days != null) { if (!(+b.retain_days >= 30 && +b.retain_days <= 3650)) throw bad('보존 기간은 30~3650일입니다.'); s.retain_days = +b.retain_days; }
    if (Array.isArray(b.domains)) { const d = b.domains.map(x => String(x).trim().toLowerCase()).filter(Boolean); if (d.some(x => !/^[a-z0-9.-]+(:\d+)?$/.test(x))) throw bad('도메인 형식이 올바르지 않습니다(예: eclass.jnu.ac.kr).', 'domains'); s.domains = d; }
    if (b.stt_lang) s.stt_lang = b.stt_lang; if (Array.isArray(b.targets)) s.targets = b.targets.filter(x => LANGS[x]); return setJ(); };
  L['POST /api/lms/v/create'] = b => { if (!/^(video|audio)\//.test(b.mime || '')) throw bad('동영상 · 음성 파일만 올릴 수 있습니다.', 'mime'); if (!b.title) throw bad('영상 제목을 입력하세요.', 'required');
    if (b.kind === 'record' && b.consent !== true) throw bad('녹화 영상은 촬영 · 녹음 동의가 필요합니다.', 'consent'); if (+b.size > 2147483648) throw bad('영상은 2GB까지 올릴 수 있습니다.', 'too_large');
    const m = { media_id: W3.uid(), title: String(b.title).slice(0, 120), kind: b.kind || 'upload', status: 'uploading', progress: 0, src_name: b.name || '', src_mime: String(b.mime).split(';')[0], src_size: +b.size, chunks: Math.ceil(+b.size / CHUNK), received: 0,
      trim_start: b.trim_start ?? null, trim_end: b.trim_end ?? null, duration_sec: b.duration_hint ? Math.max(1, (b.trim_end ?? b.duration_hint) - (b.trim_start || 0)) : 60, renditions: [], access: 'enrolled', domains: [], url_ver: 1,
      consent: b.kind === 'record' ? { at: W3.ts(now()), by: (S.me && S.me.name) || '교수자', ver: 'rec-v1', items: b.consent_items || [] } : null, retain_until: new Date(now() + DS().mset.retain_days * 864e5).toISOString().slice(0, 10),
      stt_auto: !!b.stt, stt_lang: b.stt_lang || DS().mset.stt_lang, place_session: b.session_id || null, place_title: b.place_title || null, created_at: W3.ts(now()), jobs: [], job: null };
    DS().media.unshift(m); dlog(m, 'create'); return { media: mJ(m) }; };
  L['POST /api/lms/v/chunk'] = b => { const m = mOf(b.media_id); m.received = Math.max(m.received || 0, (+b.seq) + 1); return { media_id: m.media_id, seq: +b.seq, received: m.received, chunks: m.chunks }; };
  L['POST /api/lms/v/finish'] = b => { const m = mOf(b.media_id); if (m.status !== 'uploading') throw bad('이미 올리기를 마친 영상입니다.', 'not_uploading'); m.status = 'queued'; m.job = { job_id: W3.uid(), kind: 'transcode', status: 'queued', progress: 0, step: '대기', lang: null, engine: 'ffmpeg', error: null, attempts: 0, created_at: W3.ts(now()) }; dlog(m, 'upload'); return { media: mJ(m) }; };
  L['GET /api/lms/v/list'] = () => { seedV(); const it = DS().media.filter(m => m.status !== 'deleted'); it.forEach(tickDemo);
    return { items: it.map(mJ), counts: { ready: it.filter(m => m.status === 'ready').length, working: it.filter(m => ['uploading', 'queued', 'processing'].includes(m.status)).length, failed: it.filter(m => m.status === 'failed').length,
      no_caption: it.filter(m => m.status === 'ready' && !capsOf(m).some(c => c.status === 'published')).length, unplaced: it.filter(m => m.status === 'ready' && !places(m).length).length }, settings: setJ() }; };
  L['GET /api/lms/v/get'] = b => { const m = mOf(b.media_id); return Object.assign(mJ(m), { jobs: [m.job, ...m.jobs].filter((x, i, a) => x && a.indexOf(x) === i), files: { count: m.status === 'ready' ? 2 + Math.ceil((m.duration_sec || 60) / 6) * 2 : 0, bytes: m.status === 'ready' ? Math.round(m.src_size * 0.7) : 0, segments: m.status === 'ready' ? Math.ceil((m.duration_sec || 60) / 6) * 2 : 0 },
    places: places(m), log: DS().mlog.filter(x => x.media_id === m.media_id).slice(0, 30) }); };
  L['POST /api/lms/v/place'] = b => { const m = mOf(b.media_id); if (m.status !== 'ready') throw bad('변환이 끝난 영상만 배치할 수 있습니다.', 'not_ready'); const o = placeDo(m, b.session_id, b.title); dlog(m, 'place'); return o; };
  L['POST /api/lms/v/access'] = b => { const m = mOf(b.media_id); if (b.access) m.access = b.access; if (Array.isArray(b.domains)) m.domains = b.domains.map(x => String(x).trim().toLowerCase()).filter(Boolean); dlog(m, 'access'); return { media: mJ(m) }; };
  L['POST /api/lms/v/rotate'] = b => { const m = mOf(b.media_id); m.url_ver = (m.url_ver || 1) + 1; dlog(m, 'rotate'); return { media_id: m.media_id, url_ver: m.url_ver }; };
  L['POST /api/lms/v/delete'] = b => { const m = mOf(b.media_id); m.status = 'deleted'; dlog(m, 'delete'); delete DM.blobs[m.media_id]; return { media_id: m.media_id, deleted: true, files: 0, store: 'db' }; };
  L['GET /api/lms/v/log'] = b => { const m = mOf(b.media_id); return { media_id: m.media_id, log: DS().mlog.filter(x => x.media_id === m.media_id) }; };
  L['GET /api/lms/v/url'] = b => { const m = mOf(String(b.media_id).replace(/^media:/, '')); return { media_id: m.media_id, url: DM.blobs[m.media_id] || '', poster: '', expires_at: W3.ts(now() + DS().mset.ttl_sec * 1000), delivery: DS().mset.delivery, renditions: m.renditions, duration_sec: m.duration_sec, type: 'video/webm' }; };
  L['POST /api/lms/v/stt'] = b => { const m = mOf(b.media_id); if (m.status !== 'ready') throw bad('변환이 끝난 영상에서 자막을 만들 수 있습니다.', 'not_ready'); if (m.job && m.job.kind === 'stt' && ['queued', 'running'].includes(m.job.status)) throw bad('자막을 만드는 중입니다. 잠시 뒤 확인하세요.', 'busy');
    if (m.job && !m.jobs.includes(m.job)) m.jobs.unshift(m.job); m.job = { job_id: W3.uid(), kind: 'stt', status: 'queued', progress: 0, step: '대기', lang: b.lang || m.stt_lang || 'ko', engine: null, error: null, attempts: 0, created_at: W3.ts(now()) }; return { job: m.job }; };
  L['GET /api/lms/v/captions'] = b => { const m = mOf(b.media_id); return { media_id: m.media_id, duration_sec: m.duration_sec, targets: DS().mset.targets, captions: capsOf(m), job: m.job && m.job.kind === 'stt' ? m.job : (m.jobs.find(j => j.kind === 'stt') || null) }; };
  L['POST /api/lms/v/caption'] = b => { const m = mOf(b.media_id); if (!LANGS[b.lang]) throw bad('지원하지 않는 언어입니다.', 'lang'); const cues = typeof b.text === 'string' ? W3.parseSub(b.text) : b.cues;
    if (!Array.isArray(cues) || !cues.length || cues.length > 3000 || cues.some(x => typeof x.s !== 'number' || typeof x.e !== 'number' || typeof x.t !== 'string' || x.e <= x.s || x.s < 0 || x.t.length > 500)) throw bad('자막 형식이 올바르지 않습니다(시작 < 끝, 대사 500자 이내, 1~3000줄).', 'bad_sub');
    const src = b.source || 'edit'; DS().mcaps[m.media_id + '|' + b.lang] = { cues: cues.map(x => ({ s: Math.round(x.s * 1000) / 1000, e: Math.round(x.e * 1000) / 1000, t: x.t })).sort((a, z) => a.s - z.s), source: src, engine: src === 'translate' ? (b.engine || 'claude') : null, status: 'draft', updated_at: W3.ts(now()), published_at: null };
    return { media_id: m.media_id, lang: b.lang, cues: cues.length, status: 'draft', source: src }; };
  L['POST /api/lms/v/caption-publish'] = b => { const m = mOf(b.media_id); const c = DS().mcaps[m.media_id + '|' + b.lang]; if (!c) throw bad('이 언어의 자막이 없습니다.', 'caption'); c.status = 'published'; c.published_at = W3.ts(now());
    const cts = D().contents.filter(x => x.src === 'media:' + m.media_id); cts.forEach(x => { D().subs[x.content_id + '|' + b.lang] = { format: 'vtt', cues: c.cues, updated_at: W3.ts(now()) }; }); dlog(m, 'caption:' + b.lang); return { media_id: m.media_id, lang: b.lang, status: 'published', contents: cts.length }; };

  /* ═════════ 메뉴 ═════════ */
  Object.assign(MENU, { lmsv: { label: '강의 영상 관리', ws: 'learn', only: 'univ' } });
  if (PRESET.univ_lms && !PRESET.univ_lms.on.includes('lmsv')) { const at = PRESET.univ_lms.on.indexOf('lmsi'); PRESET.univ_lms.on.splice(at >= 0 ? at + 1 : PRESET.univ_lms.on.length, 0, 'lmsv'); PRESET.univ_lms.off = (PRESET.univ_lms.off || []).filter(x => x !== 'lmsv'); }
  Object.keys(PRESET).filter(k => k !== 'univ_lms').forEach(k => { if (!PRESET[k].on.includes('lmsv') && !(PRESET[k].off || []).includes('lmsv')) (PRESET[k].off = PRESET[k].off || []).push('lmsv'); });
  /* 메뉴 층(nav.js): 「수업 › 강의실」에서 「동영상 · 진도」 바로 뒤 */
  try { const N = window.LMSNAV; if (N) { const room = N.G[0][3].find(h => h[0] === 'h-room'); if (room && !room[3].includes('lmsv')) room[3].splice(room[3].indexOf('lmsi') + 1, 0, 'lmsv'); N.LBL.lmsv = '강의 영상 관리'; } } catch (e) { }
  /* 저장된 대학 학사 LMS 기관: 탭 목록에 없으면 켠다(upgradeState를 감싼다 — lms/a.js와 같은 방식) */
  const navOn = () => { if (!S || !S.nav || !S.nav.tabs || !ULMS_()) return; if (!Object.values(S.nav.tabs).some(L => (L || []).some(x => x.id === 'lmsv'))) { if (typeof navAdd === 'function') navAdd('lmsv', true); else { (S.nav.tabs.learn = S.nav.tabs.learn || []).push({ id: 'lmsv', on: true }); save(); } } };
  if (typeof upgradeState === 'function') { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { navOn(); } catch (e) { } return r; }; } // eslint-disable-line no-global-assign
  if (typeof AFTER !== 'undefined') AFTER.push(() => { try { navOn(); } catch (e) { } });

  if (!document.querySelector('style[data-lmsv]')) { const st = document.createElement('style'); st.dataset.lmsv = '1'; st.textContent = `
.lmsv-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:16px}
@media (max-width:900px){.lmsv-grid{grid-template-columns:minmax(0,1fr)}}
.lmsv-vid{position:relative;background:#0f172a;border-radius:10px;overflow:hidden;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:13px;text-align:center;padding:0}
.lmsv-vid video{width:100%;height:100%;object-fit:contain;background:#000}
.lmsv-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.lmsv-row>label{display:flex;flex-direction:column;gap:4px;font-size:13px;min-width:0;flex:1 1 160px}
.lmsv-pb{height:8px;border-radius:99px;background:var(--line,#e2e8f0);overflow:hidden;min-width:80px}.lmsv-pb i{display:block;height:100%;background:var(--pri,#5C74F6)}
.lmsv-ck{display:flex;gap:8px;align-items:flex-start;font-size:13px;margin:4px 0}.lmsv-ck input{margin-top:3px}
.lmsv-cues input{width:100%;min-width:0}.lmsv-cues td{vertical-align:top}.lmsv-cues .n{width:84px}
.lmsv-rec{font-variant-numeric:tabular-nums;font-weight:700}.lmsv-rec.on{color:var(--bad,#dc2626)}
.lmsv-chips{display:flex;flex-wrap:wrap;gap:6px}.lmsv-chips button{border:1px solid var(--line,#e2e8f0);background:var(--card,#fff);border-radius:999px;padding:4px 10px;font-size:13px;cursor:pointer;color:inherit}.lmsv-chips button.on{background:var(--pri,#5C74F6);color:#fff;border-color:var(--pri,#5C74F6)}
.lmsv-note{font-size:12px;color:var(--mut,#64748b);margin:6px 0 0}
.lmsv-wrap{overflow-wrap:anywhere}`; document.head.appendChild(st); }

  /* ═════════ 화면 ═════════ */
  const V = { sel: null, rec: { state: 'idle' }, up: null, capLang: null, edit: null };
  const pbar = p => `<span class="lmsv-pb" aria-label="진행 ${p}%"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></span>`;
  const stTag = m => m.status === 'ready' ? tag('재생 가능', 'g') : m.status === 'failed' ? tag('변환 실패', 'r') : `${tag(ST_N[m.status] || m.status, 'y')} ${m.progress ? m.progress + '%' : ''}`;
  const isAdmin = () => S.me && ['owner', 'sub'].includes(S.me.role);
  let poll = 0;
  const watch = on => { if (on && !poll) poll = setInterval(() => { if (!document.querySelector('[data-lmsv-root]')) { clearInterval(poll); poll = 0; return; } W3.drop('lmsv:'); render(); }, 2500); if (!on && poll) { clearInterval(poll); poll = 0; } };

  VIEWS.lmsv = () => {
    if (!ULMS_()) return '<div class="empty">대학(학사 LMS) 에디션에서 쓰는 화면입니다.</div>';
    const sec = W3.section(); if (sec === undefined) return W3.loading; if (sec.__err) return `<div class="empty">${esc(sec.__err)}</div>`;
    const Lst = W3.get('lmsv:list', 'GET', '/api/lms/v/list', {}); if (Lst === undefined) return W3.loading; if (Lst.__err) return `<div class="empty">${esc(Lst.__err)}</div>`;
    const it = Lst.items; const c = Lst.counts; watch(it.some(m => ['uploading', 'queued', 'processing'].includes(m.status) || (m.job && m.job.kind === 'stt' && ['queued', 'running'].includes(m.job.status))));
    if (!V.sel || !it.find(m => m.media_id === V.sel)) V.sel = (it.find(m => m.status === 'ready') || it[0] || {}).media_id || null;
    const t = UI.lmsvT || 'list';
    const todo = c.working ? `영상 ${c.working}개를 변환하고 있습니다. 끝나면 지정한 차시에 자동으로 놓입니다.` : c.unplaced ? `차시에 놓지 않은 영상 ${c.unplaced}개가 있습니다.` : c.no_caption ? `학생에게 자막을 게시하지 않은 영상 ${c.no_caption}개가 있습니다.` : '모든 영상이 차시에 놓였고 자막도 게시되었습니다.';
    const tbtn = c.unplaced ? `<button class="btn sm" data-act="lmsv-todo" data-v="place">차시에 놓기</button>` : c.no_caption ? `<button class="btn sm" data-act="lmsv-todo" data-v="cap">자막 만들기</button>` : '';
    const TB = [['list', '영상'], ['rec', '녹화하기'], ['cap', '자막'], ['set', '전송 설정']];
    const tb = window.LMSX && LMSX.tabs4 ? LMSX.tabs4('lmsvT', TB, t) : tabs('lmsvT', TB, t);
    const body = { list: vList, rec: vRec, cap: vCap, set: vSet }[t] || vList;
    return `<div data-lmsv-root>${head('강의 영상 관리', '강의 영상을 올리거나 바로 녹화하면 학교 서버가 스트리밍용으로 변환하고, 고른 차시에 놓습니다. 진도와 자동출석은 「동영상 · 진도」와 같이 계산됩니다.', `<button class="btn pri" data-act="lmsv-up">영상 올리기</button> ${W3.mode()}`)}
      ${window.LMSX && LMSX.todo ? LMSX.todo(esc(todo), tbtn) : `<p class="mini">${esc(todo)}</p>`}
      <div class="kpis">${kpi('재생 가능', c.ready + '개')}${kpi('변환 중', c.working + '개', '', c.working ? 'warn' : '')}${kpi('자막 미게시', c.no_caption + '개', '', c.no_caption ? 'warn' : '')}${kpi('차시 미배치', c.unplaced + '개')}</div>
      ${tb}${body(sec, it, Lst)}</div>`;
  };
  ACT['lmsv-todo'] = el => { UI.lmsvT = el.dataset.v === 'cap' ? 'cap' : 'list'; const L2 = W3.cache['lmsv:list']; if (L2) { const m = el.dataset.v === 'cap' ? L2.items.find(x => x.status === 'ready' && !x.captions.some(c => c.status === 'published')) : L2.items.find(x => x.status === 'ready' && !x.placements); if (m) V.sel = m.media_id; } render(); };

  /* ── 영상 목록 · 상세 ── */
  function vList(sec, it) {
    const rows = it.map(m => [`<button class="btn sm ghost lmsv-wrap" data-act="lmsv-sel" data-id="${esc(m.media_id)}" style="text-align:left">${m.media_id === V.sel ? '▶ ' : ''}<b>${esc(m.title)}</b></button>`, stTag(m), m.duration_sec ? mmss(m.duration_sec) : '—', m.placements ? m.placements + '곳' : tag('미배치', 'y'), m.captions.filter(x => x.status === 'published').map(x => x.lang.toUpperCase()).join(' · ') || '—']);
    return `<div class="lmsv-grid"><div class="card"><div class="ch"><b>올린 영상</b><small>${it.length}개 · 원본은 변환 뒤 지우고 스트리밍 파일(HLS)만 보관합니다</small></div>${table(['제목', '상태', '길이', '배치', '게시 자막'], rows, '아직 올린 영상이 없습니다. 「영상 올리기」나 「녹화하기」로 시작하세요.')}</div>
      <div>${vDetail(sec)}</div></div>`;
  }
  function vDetail(sec) {
    if (!V.sel) return `<div class="card"><div class="empty">영상을 고르면 미리보기와 배치 · 공개 범위가 여기에 나옵니다.<br><button class="btn sm pri" data-act="lmsv-up" style="margin-top:8px">영상 올리기</button></div></div>`;
    const m = W3.get('lmsv:get:' + V.sel, 'GET', '/api/lms/v/get', { media_id: V.sel }); if (m === undefined) return `<div class="card">${W3.loading}</div>`; if (m.__err) return `<div class="card"><div class="empty">${esc(m.__err)}</div></div>`;
    const Ss = W3.get('sessions:' + sec.section_id, 'GET', '/api/lms/g/sessions', { section_id: sec.section_id }) || [];
    const sesOpt = (Array.isArray(Ss) ? Ss : []).filter(s => s.kind !== 'holiday').map(s => `<option value="${esc(s.session_id)}">${s.week_no}주 ${s.seq}차시${s.kind === 'online' ? ' · 온라인' : ''}</option>`).join('');
    const ready = m.status === 'ready'; const playable = ready && (W3.live() || DM.blobs[m.media_id]);
    const job = m.job; const jobLine = job ? `${job.kind === 'transcode' ? '변환' : '자막'} 작업: ${esc({ queued: '대기', running: '진행 중', done: '끝', failed: '실패' }[job.status] || job.status)}${job.step ? ' · ' + esc(job.step) : ''}${job.status === 'running' ? ' ' + pbar(job.progress) : ''}${job.error ? ' · ' + esc(job.error) : ''}` : '';
    return `<div class="card"><div class="ch"><b class="lmsv-wrap">${esc(m.title)}</b>${stTag(m)}</div>
      <div class="lmsv-vid">${playable ? `<video controls playsinline preload="metadata" data-media="media:${esc(m.media_id)}"></video>` : `<span>${ready ? '데모: 이 브라우저에서 올린 영상만 미리 봅니다(운영 서버에서는 학교 서버 스트리밍으로 재생).' : m.status === 'failed' ? esc(m.error || '변환하지 못했습니다.') : `변환 중입니다 ${pbar(m.progress)} ${m.progress}%`}</span>`}</div>
      <p class="lmsv-note">${ready ? `화질 ${m.renditions.map(r => r.name).join(' · ')} 자동 전환 · 길이 ${mmss(m.duration_sec)} · 스트리밍 파일 ${m.files.segments}조각 ${mb(m.files.bytes)}` : esc(m.src_name || '')} ${jobLine ? '<br>' + jobLine : ''}</p>
      <div class="lmsv-row"><label>놓을 차시<select id="lmsvSes" aria-label="놓을 차시">${sesOpt}</select></label><button class="btn sm pri" data-act="lmsv-place" ${ready ? '' : 'disabled'}>차시에 놓기</button></div>
      ${m.places.length ? `<p class="lmsv-note">놓인 곳: ${m.places.map(p => `${esc(p.section_title || '')} ${p.week_no}주 ${p.seq}차시`).join(', ')} — 학생은 「동영상 · 진도」 플레이어로 보고, 본 구간만 진도 · 출석으로 인정됩니다.</p>` : ''}
      <details><summary>공개 범위 · 재생 주소 · 기록</summary>
        <div class="lmsv-row"><label>공개 범위<select id="lmsvAcc"><option value="enrolled" ${m.access === 'enrolled' ? 'selected' : ''}>놓인 분반 수강생</option><option value="staff" ${m.access === 'staff' ? 'selected' : ''}>교수자 · 운영자만</option></select></label>
          <label>허용 사이트(쉼표, 비우면 기관 설정)<input id="lmsvDom" value="${esc((m.domains || []).join(', '))}" placeholder="eclass.jnu.ac.kr"></label><button class="btn sm" data-act="lmsv-access">저장</button></div>
        <div class="lmsv-row"><button class="btn sm" data-act="lmsv-rotate">재생 주소 다시 만들기</button><span class="lmsv-note">지금 판 ${m.url_ver} — 다시 만들면 이미 나간 주소는 모두 끊깁니다.</span></div>
        ${m.consent ? `<p class="lmsv-note">녹화 동의: ${esc(W3.fmt(m.consent.at))} · ${esc((m.consent.items || []).map(x => ({ screen: '화면', cam: '카메라', mic: '마이크' }[x] || x)).join(' · '))}</p>` : ''}
        <p class="lmsv-note">보존 기한 ${esc(m.retain_until || '')}(지나면 자동 파기) · 열람 기록 ${m.log.length}건</p>
        ${table(['누가', '무엇', '언제'], m.log.slice(0, 8).map(l => [esc(l.actor), esc({ create: '등록', upload: '올리기', url: '재생 주소 받기', play: '재생', place: '배치', access: '공개 범위', rotate: '주소 재생성', delete: '삭제', purge: '자동 파기' }[l.action] || l.action.replace('caption:', '자막 게시 ')), esc(W3.fmt(l.at))]), '기록이 없습니다.')}
        <div class="lmsv-row"><button class="btn sm ghost redl" data-act="lmsv-del">영상 삭제</button></div></details></div>`;
  }
  ACT['lmsv-sel'] = el => { V.sel = el.dataset.id; render(); };
  const refresh = () => { W3.drop('lmsv:'); W3.drop('contents:'); W3.drop('subs:'); render(); };
  ACT['lmsv-place'] = () => W3.act(() => W3.call('POST', '/api/lms/v/place', { media_id: V.sel, session_id: $('#lmsvSes').value }), r => `${r.week_no}주 ${r.seq}차시에 놓았습니다.`).then(r => { if (r) refresh(); });
  ACT['lmsv-access'] = () => W3.act(() => W3.call('POST', '/api/lms/v/access', { media_id: V.sel, access: $('#lmsvAcc').value, domains: $('#lmsvDom').value.split(',').map(x => x.trim()).filter(Boolean) }), '공개 범위를 저장했습니다.').then(r => { if (r) refresh(); });
  ACT['lmsv-rotate'] = () => W3.act(() => W3.call('POST', '/api/lms/v/rotate', { media_id: V.sel }), r => `재생 주소를 다시 만들었습니다(판 ${r.url_ver}).`).then(r => { if (r) refresh(); });
  ACT['lmsv-del'] = () => modal('영상 삭제', '<p>이 영상과 스트리밍 파일 · 자막을 지웁니다. 차시에 놓인 영상은 더 재생되지 않습니다.</p>', [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'danger', run: () => { W3.act(() => W3.call('POST', '/api/lms/v/delete', { media_id: V.sel }), '삭제했습니다.').then(r => { if (r) { V.sel = null; refresh(); } }); } }]);

  /* ── 올리기(파일 · 녹화 공용): 1MB 조각 → 마침 ── */
  async function upload(blob, meta) {
    V.up = { name: meta.title, pct: 0 }; render();
    try {
      const c = await W3.call('POST', '/api/lms/v/create', { ...meta, mime: blob.type || 'video/mp4', size: blob.size });
      const m = c.media; if (!W3.live()) DM.blobs[m.media_id] = URL.createObjectURL(blob);
      for (let i = 0; i < m.chunks; i++) {
        const part = blob.slice(i * m.chunk_size, (i + 1) * m.chunk_size); const b64 = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => no(new Error('파일을 읽지 못했습니다.')); r.readAsDataURL(part); });
        let tries = 0; for (;;) { try { await W3.call('POST', '/api/lms/v/chunk', { media_id: m.media_id, seq: i, b64 }); break; } catch (e) { if (++tries >= 3) throw e; await new Promise(r => setTimeout(r, 800 * tries)); } }
        V.up.pct = Math.round(100 * (i + 1) / m.chunks); const pb = document.querySelector('[data-lmsv-up] i'); if (pb) pb.style.width = V.up.pct + '%'; else render();
      }
      await W3.call('POST', '/api/lms/v/finish', { media_id: m.media_id });
      V.sel = m.media_id; V.up = null; UI.lmsvT = 'list'; toast('올렸습니다. 학교 서버가 변환을 시작했습니다.', 'ok'); refresh(); return m;
    } catch (e) { V.up = null; toast(e.message, 'warn'); render(); return null; }
  }
  ACT['lmsv-up'] = () => {
    const sec = W3.section(); const Ss = (sec && W3.cache['sessions:' + sec.section_id]) || [];
    const w = modal('영상 올리기', `<label class="fl">동영상 파일(mp4 · mov · webm, 2GB까지)<input type="file" name="f" accept="video/*,audio/*"></label><label class="fl">제목<input name="title" maxlength="120"></label>
      <label class="fl">다 되면 놓을 차시(선택)<select name="ses"><option value="">나중에 고르기</option>${(Array.isArray(Ss) ? Ss : []).filter(s => s.kind !== 'holiday').map(s => `<option value="${esc(s.session_id)}">${s.week_no}주 ${s.seq}차시</option>`).join('')}</select></label>
      <label class="lmsv-ck"><input type="checkbox" name="stt" checked> 변환이 끝나면 AI 자동자막(음성 인식)도 만들기</label><p class="lmsv-note">학교 서버에서 H.264 · 360p · 720p 스트리밍 파일로 바꿉니다. 원본은 변환 뒤 지웁니다.</p>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '올리기', kind: 'pri', run: w2 => { const f = w2.querySelector('[name=f]').files[0]; if (!f) { toast('파일을 고르세요.', 'warn'); return false; }
        const go2 = dur => upload(f, { title: fv(w2, 'title') || f.name.replace(/\.[^.]+$/, ''), name: f.name, kind: 'upload', session_id: fv(w2, 'ses') || undefined, stt: !!fv(w2, 'stt'), duration_hint: dur });
        const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => { go2(isFinite(v.duration) ? v.duration : undefined); URL.revokeObjectURL(v.src); }; v.onerror = () => go2(undefined); v.src = URL.createObjectURL(f); } }]);
    void w;
  };

  /* ── 녹화하기(MediaRecorder): 화면 · 카메라 · 마이크, 일시정지 · 이어서, 미리보기, 앞뒤 자르기 ── */
  const R = V.rec;
  function vRec(sec) {
    const Ss = W3.get('sessions:' + sec.section_id, 'GET', '/api/lms/g/sessions', { section_id: sec.section_id }) || [];
    const sup = !!(window.MediaRecorder && navigator.mediaDevices); const set = (W3.cache['lmsv:list'] || {}).settings || {};
    if (V.up) return `<div class="card"><b>올리는 중 — ${esc(V.up.name)}</b><div class="lmsv-row" data-lmsv-up>${pbar(V.up.pct)}</div></div>`;
    if (R.state === 'done') {
      const d = R.dur || 0; const ts = R.ts || 0, te = R.te == null ? d : R.te;
      return `<div class="lmsv-grid"><div class="card"><div class="ch"><b>미리보기 · 자르기</b><small>녹화 ${mmss(d)}</small></div><div class="lmsv-vid"><video id="lmsvPrev" src="${esc(R.url)}" controls playsinline></video></div>
        <div class="lmsv-row"><label>앞 자르기(초)<input type="number" id="lmsvTs" min="0" max="${Math.floor(d)}" step="0.5" value="${ts}" data-chg="lmsv-trim"></label><label>끝(초)<input type="number" id="lmsvTe" min="0" max="${Math.ceil(d)}" step="0.5" value="${Math.round(te * 10) / 10}" data-chg="lmsv-trim"></label><button class="btn sm" data-act="lmsv-trimplay">자른 구간 재생</button></div>
        <p class="lmsv-note">올리면 학교 서버가 ${mmss(ts)} ~ ${mmss(te)} 구간만 변환합니다(원본 파일은 바꾸지 않음).</p></div>
        <div class="card"><div class="ch"><b>올리고 놓기</b></div><label class="fl">제목<input id="lmsvRt" maxlength="120" value="${esc(R.title || `${new Date().getMonth() + 1}월 ${new Date().getDate()}일 강의 녹화`)}"></label>
        <label class="fl">놓을 분반 · 차시<select id="lmsvRs"><option value="">나중에 고르기</option>${(Array.isArray(Ss) ? Ss : []).filter(s => s.kind !== 'holiday').map(s => `<option value="${esc(s.session_id)}">${esc(sec.title)} · ${s.week_no}주 ${s.seq}차시</option>`).join('')}</select></label>
        <label class="lmsv-ck"><input type="checkbox" id="lmsvRstt" checked> AI 자동자막도 만들기</label>
        <div class="lmsv-row"><button class="btn pri" data-act="lmsv-recup">올리기</button><button class="btn ghost" data-act="lmsv-recdrop">버리고 다시 녹화</button><button class="btn ghost" data-act="lmsv-recsave">내 컴퓨터에 저장</button></div></div></div>`;
    }
    if (R.state === 'rec' || R.state === 'paused') return `<div class="lmsv-grid"><div class="card"><div class="ch"><b>녹화 중</b><span class="lmsv-rec ${R.state === 'rec' ? 'on' : ''}" id="lmsvClock">${R.state === 'rec' ? '● ' : '❚❚ '}${mmss(R.elapsed())}</span></div>
      <div class="lmsv-vid"><video id="lmsvLive" muted playsinline autoplay></video></div>
      <div class="lmsv-row">${R.state === 'rec' ? '<button class="btn" data-act="lmsv-pause">일시정지</button>' : '<button class="btn pri" data-act="lmsv-resume">이어서 녹화</button>'}<button class="btn pri" data-act="lmsv-stop">녹화 끝내기</button></div></div>
      <div class="card"><p class="lmsv-note">일시정지한 동안은 녹화되지 않습니다. 끝내면 미리 보고 앞뒤를 자른 뒤 올립니다.</p></div></div>`;
    return `<div class="lmsv-grid"><div class="card"><div class="ch"><b>강의 녹화</b><small>브라우저에서 바로 녹화합니다(별도 프로그램 설치 없음)</small></div>
      ${sup ? '' : '<div class="w3-res bad" role="alert">이 브라우저는 녹화를 지원하지 않습니다. 크롬 · 엣지 최신판을 쓰거나 「영상 올리기」로 파일을 올리세요.</div>'}
      ${R.err ? `<div class="w3-res bad" role="alert">${esc(R.err)}</div>` : ''}
      <div class="lmsv-chips" role="radiogroup" aria-label="녹화 대상">${[['screen', '화면 + 마이크'], ['cam', '카메라 + 마이크'], ['both', '화면 + 카메라 + 마이크']].map(([k, l]) => `<button role="radio" aria-checked="${(R.src || 'screen') === k}" class="${(R.src || 'screen') === k ? 'on' : ''}" data-act="lmsv-src" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="lmsv-row"><button class="btn pri" data-act="lmsv-start" ${sup ? '' : 'disabled'}>녹화 시작</button></div></div>
      <div class="card"><div class="ch"><b>촬영 · 녹음 동의</b></div>
        <label class="lmsv-ck"><input type="checkbox" id="lmsvC1" ${R.c1 ? 'checked' : ''}> 내 화면 · 얼굴(카메라) · 목소리가 녹화되어 학교 서버에 저장되는 데 동의합니다.</label>
        <label class="lmsv-ck"><input type="checkbox" id="lmsvC2" ${R.c2 ? 'checked' : ''}> 녹화본은 보존 기간(${set.retain_days || 365}일)이 지나면 자동 파기되고, 재생 · 열람은 기록으로 남는 것을 확인했습니다.</label>
        <p class="lmsv-note">화면 공유 창에 개인정보(메신저 · 학생 명단)가 보이지 않게 해 주세요. 동의 시각은 영상 기록에 남습니다.</p></div></div>`;
  }
  ACT['lmsv-src'] = el => { R.src = el.dataset.v; render(); };
  R.elapsed = () => (R.acc || 0) + (R.state === 'rec' && R.t0 ? (now() - R.t0) / 1000 : 0);
  const stopAll = () => { [R.screen, R.cam, R.mic, R.out].forEach(s => s && s.getTracks().forEach(t => t.stop())); if (R.raf) cancelAnimationFrame(R.raf); if (R.clock) clearInterval(R.clock); R.screen = R.cam = R.mic = R.out = null; R.raf = R.clock = 0; };
  ACT['lmsv-start'] = async () => {
    R.c1 = $('#lmsvC1').checked; R.c2 = $('#lmsvC2').checked; R.err = '';
    if (!R.c1 || !R.c2) { R.err = '녹화하려면 위 두 가지에 모두 동의해야 합니다.'; render(); return; }
    const src = R.src || 'screen'; const md = navigator.mediaDevices;
    try {
      if (src !== 'cam') R.screen = await md.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
      if (src !== 'screen') R.cam = await md.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      try { R.mic = await md.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch (e) { R.mic = null; toast('마이크를 쓸 수 없어 소리 없이 녹화합니다.', 'warn'); }
    } catch (e) { stopAll(); R.err = e && e.name === 'NotAllowedError' ? '화면 · 카메라 권한이 거부되었습니다. 주소창 왼쪽 자물쇠에서 허용하거나, 녹화 프로그램으로 만든 파일을 「영상 올리기」로 올리세요.' : `녹화 장치를 열지 못했습니다(${e && e.name || '오류'}). 「영상 올리기」로 파일을 올릴 수 있습니다.`; render(); return; }
    let vtrack;
    if (src === 'both') { /* 화면 위 오른쪽 아래에 카메라를 겹쳐 그린다 */
      const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; const g = cv.getContext('2d');
      const vs = document.createElement('video'); vs.muted = true; vs.srcObject = R.screen; vs.play().catch(() => { }); const vc = document.createElement('video'); vc.muted = true; vc.srcObject = R.cam; vc.play().catch(() => { });
      const draw = () => { g.fillStyle = '#000'; g.fillRect(0, 0, 1280, 720); if (vs.videoWidth) { const k = Math.min(1280 / vs.videoWidth, 720 / vs.videoHeight); const w = vs.videoWidth * k, h = vs.videoHeight * k; g.drawImage(vs, (1280 - w) / 2, (720 - h) / 2, w, h); } if (vc.videoWidth) g.drawImage(vc, 1280 - 336, 720 - 196, 320, 180); R.raf = requestAnimationFrame(draw); };
      draw(); vtrack = cv.captureStream(30).getVideoTracks()[0];
    } else vtrack = (R.screen || R.cam).getVideoTracks()[0];
    R.out = new MediaStream([vtrack, ...(R.mic ? R.mic.getAudioTracks() : [])]);
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(x => MediaRecorder.isTypeSupported(x)) || '';
    R.chunks = []; R.rec = new MediaRecorder(R.out, mime ? { mimeType: mime, videoBitsPerSecond: 2500000 } : undefined);
    R.rec.ondataavailable = e => { if (e.data && e.data.size) R.chunks.push(e.data); };
    R.rec.onstop = () => { const t = R.rec.mimeType || mime || 'video/webm'; R.blob = new Blob(R.chunks, { type: t.split(';')[0] }); R.url = URL.createObjectURL(R.blob); R.dur = Math.max(1, Math.round(R.elapsed() * 10) / 10); R.ts = 0; R.te = null; R.acc = R.dur; R.state = 'done'; stopAll(); render(); };
    vtrack.addEventListener('ended', () => { if (R.rec && R.rec.state !== 'inactive') ACT['lmsv-stop'](); });
    R.rec.start(1000); R.acc = 0; R.t0 = now(); R.state = 'rec'; render();
    R.clock = setInterval(() => { const c = document.getElementById('lmsvClock'); if (c) c.textContent = (R.state === 'rec' ? '● ' : '❚❚ ') + mmss(R.elapsed()); const lv = document.getElementById('lmsvLive'); if (lv && !lv.srcObject && R.out) lv.srcObject = R.out; }, 500);
  };
  ACT['lmsv-pause'] = () => { if (R.rec && R.rec.state === 'recording') { R.rec.pause(); R.acc = R.elapsed(); R.t0 = 0; R.state = 'paused'; render(); } };
  ACT['lmsv-resume'] = () => { if (R.rec && R.rec.state === 'paused') { R.rec.resume(); R.t0 = now(); R.state = 'rec'; render(); } };
  ACT['lmsv-stop'] = () => { if (R.rec && R.rec.state !== 'inactive') { R.acc = R.elapsed(); R.t0 = 0; R.rec.stop(); } };
  ACT['lmsv-trim'] = () => { const d = R.dur || 0; let ts = Math.max(0, Math.min(d, +$('#lmsvTs').value || 0)); let te = Math.max(0, Math.min(d, +$('#lmsvTe').value || d)); if (te <= ts) { te = Math.min(d, ts + 1); toast('끝은 시작보다 뒤여야 합니다.', 'warn'); } R.ts = ts; R.te = te; R.title = ($('#lmsvRt') || {}).value || R.title; render(); };
  ACT['lmsv-trimplay'] = () => { const v = $('#lmsvPrev'); if (!v) return; const te = R.te == null ? R.dur : R.te; v.currentTime = R.ts || 0; v.play().catch(() => { }); const stop = () => { if (v.currentTime >= te) { v.pause(); v.removeEventListener('timeupdate', stop); } }; v.addEventListener('timeupdate', stop); };
  ACT['lmsv-recdrop'] = () => { if (R.url) URL.revokeObjectURL(R.url); Object.assign(R, { state: 'idle', blob: null, url: null, err: '' }); render(); };
  ACT['lmsv-recsave'] = () => { if (!R.blob) return; const a = document.createElement('a'); a.href = R.url; a.download = '강의녹화.' + (/mp4/.test(R.blob.type) ? 'mp4' : 'webm'); a.click(); };
  ACT['lmsv-recup'] = async () => {
    if (!R.blob) return; const d = R.dur || 0; const ts = R.ts || 0; const te = R.te == null ? null : R.te;
    const m = await upload(R.blob, { title: ($('#lmsvRt').value || '강의 녹화').trim(), name: '녹화.webm', kind: 'record', consent: true, consent_items: (R.src || 'screen') === 'screen' ? ['screen', 'mic'] : (R.src === 'cam' ? ['cam', 'mic'] : ['screen', 'cam', 'mic']),
      trim_start: ts > 0 ? ts : undefined, trim_end: te != null && te < d ? te : undefined, session_id: $('#lmsvRs').value || undefined, stt: $('#lmsvRstt').checked, duration_hint: d });
    if (m) { Object.assign(R, { state: 'idle', blob: null, err: '' }); }
  };

  /* ── 자막: AI 자동자막(STT) · 편집 · 번역(Claude) · 게시 ── */
  function vCap(sec, it) {
    const ready = it.filter(m => m.status === 'ready'); if (!ready.length) return `<div class="card"><div class="empty">변환이 끝난 영상이 없습니다. 영상을 올리면 자막을 만들 수 있습니다.<br><button class="btn sm pri" data-act="lmsv-up" style="margin-top:8px">영상 올리기</button></div></div>`;
    if (!ready.find(m => m.media_id === V.sel)) V.sel = ready[0].media_id;
    const C = W3.get('lmsv:caps:' + V.sel, 'GET', '/api/lms/v/captions', { media_id: V.sel }); if (C === undefined) return W3.loading; if (C.__err) return `<div class="empty">${esc(C.__err)}</div>`;
    const caps = C.captions; if (!V.capLang || !caps.find(c => c.lang === V.capLang)) V.capLang = (caps[0] || {}).lang || null;
    const cur = caps.find(c => c.lang === V.capLang); const job = C.job; const busy = job && ['queued', 'running'].includes(job.status);
    const set = (W3.cache['lmsv:list'] || {}).settings || {}; const srcN = { stt: 'AI 음성 인식', demo: '데모 자막', translate: 'AI 번역', edit: '직접 편집', upload: '파일 등록' };
    if (V.edit && V.edit.key !== V.sel + '|' + V.capLang) V.edit = null;
    const cues = V.edit ? V.edit.cues : (cur ? cur.cues : []);
    return `<div class="card"><div class="ch"><b>자막</b><select data-chg="lmsv-capm" aria-label="영상">${ready.map(m => `<option value="${esc(m.media_id)}" ${m.media_id === V.sel ? 'selected' : ''}>${esc(m.title)}</option>`).join('')}</select></div>
      <div class="lmsv-row"><label>음성 언어<select id="lmsvSl">${Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${k === (set.stt_lang || 'ko') ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <button class="btn pri" data-act="lmsv-stt" ${busy ? 'disabled' : ''}>AI 자동자막 만들기</button>${busy ? `<span>${esc(job.step || '대기')} ${pbar(job.progress)}</span>` : job && job.status === 'failed' ? tag('실패: ' + (job.error || ''), 'r') : ''}</div>
      <p class="lmsv-note">학교 서버에서 음성을 뽑아 음성 인식(Whisper)으로 자막을 만듭니다. 엔진이 설치되지 않은 서버에서는 「데모 자막」으로 표시됩니다. 만든 자막은 초안이며, 「학생에게 게시」를 눌러야 학습자 플레이어에 나옵니다.</p>
      <div class="lmsv-chips">${caps.map(c => `<button class="${c.lang === V.capLang ? 'on' : ''}" data-act="lmsv-capl" data-v="${c.lang}">${esc(LANGS[c.lang] || c.lang)} · ${c.status === 'published' ? '게시됨' : '초안'}</button>`).join('') || '<span class="lmsv-note">아직 자막이 없습니다.</span>'}</div></div>
      ${cur ? `<div class="card"><div class="ch"><b>${esc(LANGS[cur.lang] || cur.lang)} 자막 편집</b><small>${esc(srcN[cur.source] || cur.source)}${cur.engine ? ' · ' + esc(cur.engine) : ''} · ${cues.length}줄</small>${cur.status === 'published' && !V.edit ? tag('학생에게 보임', 'g') : tag('초안', 'y')}</div>
        ${cur.source === 'demo' ? '<div class="w3-res bad" role="note">데모 자막입니다 — 실제 음성 내용이 아닙니다. 음성 인식 엔진을 연결한 서버에서 다시 만들거나 직접 고치세요.</div>' : ''}
        <div class="tw"><table class="lmsv-cues"><thead><tr><th class="n">시작(초)</th><th class="n">끝(초)</th><th>대사</th></tr></thead><tbody>${cues.slice(0, 300).map((q, i) => `<tr><td><input type="number" step="0.1" min="0" value="${q.s}" data-lmsv-i="${i}" data-k="s" aria-label="시작"></td><td><input type="number" step="0.1" min="0" value="${q.e}" data-lmsv-i="${i}" data-k="e" aria-label="끝"></td><td><input value="${esc(q.t)}" maxlength="500" data-lmsv-i="${i}" data-k="t" aria-label="대사"></td></tr>`).join('')}</tbody></table></div>
        ${cues.length > 300 ? `<p class="lmsv-note">앞 300줄만 화면에서 고칩니다(전체 ${cues.length}줄은 VTT로 내려받아 고친 뒤 다시 올리세요).</p>` : ''}
        <div class="lmsv-row"><button class="btn pri" data-act="lmsv-pub">학생에게 게시</button><button class="btn" data-act="lmsv-capsave">고친 내용 저장</button><button class="btn ghost" data-act="lmsv-vtt">VTT 내려받기</button><label class="btn ghost" style="cursor:pointer">VTT · SRT 올리기<input type="file" accept=".vtt,.srt,text/vtt" data-chg="lmsv-vttup" hidden></label></div></div>
        <div class="card"><div class="ch"><b>번역</b><small>지금 자막을 AI(Claude)로 옮겨 언어별 초안을 만듭니다</small></div>
        <div class="lmsv-chips">${Object.entries(LANGS).filter(([k]) => k !== cur.lang).map(([k, v]) => `<button class="${(V.tr || set.targets || []).includes(k) ? 'on' : ''}" data-act="lmsv-trl" data-v="${k}">${v}</button>`).join('')}</div>
        <div class="lmsv-row"><button class="btn" data-act="lmsv-tr" ${V.trBusy ? 'disabled' : ''}>${V.trBusy ? esc(V.trBusy) : '고른 언어로 번역'}</button></div></div>` : ''}`;
  }
  ACT['lmsv-capm'] = el => { V.sel = el.value; V.capLang = null; V.edit = null; render(); };
  ACT['lmsv-capl'] = el => { V.capLang = el.dataset.v; V.edit = null; render(); };
  ACT['lmsv-stt'] = () => W3.act(() => W3.call('POST', '/api/lms/v/stt', { media_id: V.sel, lang: $('#lmsvSl').value }), '자막 만들기를 시작했습니다.').then(r => { if (r) { W3.drop('lmsv:'); render(); setTimeout(() => { W3.drop('lmsv:'); render(); }, 3500); } });
  const readCues = () => { const rows = {}; document.querySelectorAll('[data-lmsv-i]').forEach(x => { const r = rows[x.dataset.lmsvI] = rows[x.dataset.lmsvI] || {}; r[x.dataset.k] = x.dataset.k === 't' ? x.value : +x.value; });
    const C = W3.cache['lmsv:caps:' + V.sel]; const cur = C && C.captions.find(c => c.lang === V.capLang); const all = (V.edit ? V.edit.cues : cur ? cur.cues : []).slice(); Object.entries(rows).forEach(([i, r]) => { all[+i] = r; }); return all; };
  ACT['lmsv-capsave'] = () => W3.act(() => W3.call('POST', '/api/lms/v/caption', { media_id: V.sel, lang: V.capLang, cues: readCues(), source: 'edit' }), '저장했습니다(초안). 학생에게 보이려면 게시하세요.').then(r => { if (r) { V.edit = null; W3.drop('lmsv:'); render(); } });
  ACT['lmsv-pub'] = async () => { const cues = readCues(); const r0 = await W3.act(() => W3.call('POST', '/api/lms/v/caption', { media_id: V.sel, lang: V.capLang, cues, source: 'edit' })); if (!r0) return;
    W3.act(() => W3.call('POST', '/api/lms/v/caption-publish', { media_id: V.sel, lang: V.capLang }), r => r.contents ? `게시했습니다 — 놓인 콘텐츠 ${r.contents}곳의 학습자 플레이어에 나옵니다.` : '게시했습니다. 차시에 놓으면 학습자 플레이어에 나옵니다.').then(r => { if (r) { V.edit = null; W3.drop('lmsv:'); W3.drop('subs:'); W3.drop('contents:'); render(); } }); };
  ACT['lmsv-vtt'] = () => { const cues = readCues(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([toVTT(cues)], { type: 'text/vtt' })); a.download = `자막_${V.capLang}.vtt`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  ACT['lmsv-vttup'] = el => { const f = el.files && el.files[0]; if (!f) return; if (f.size > 300000) { toast('300KB 이하 파일만 올립니다.', 'warn'); return; } f.text().then(text => W3.act(() => W3.call('POST', '/api/lms/v/caption', { media_id: V.sel, lang: V.capLang, text, source: 'upload' }), r => `${r.cues}줄을 올렸습니다(초안).`).then(r => { if (r) { V.edit = null; W3.drop('lmsv:'); render(); } })); };
  ACT['lmsv-trl'] = el => { const set = (W3.cache['lmsv:list'] || {}).settings || {}; const L2 = new Set(V.tr || set.targets || []); L2.has(el.dataset.v) ? L2.delete(el.dataset.v) : L2.add(el.dataset.v); V.tr = [...L2]; render(); };
  /* 번역: 스튜디오의 기존 AI 경로(POST /api/ai/messages — 개인정보 가림 · 기관 정책 · 사용량 한도를 서버가 적용). 줄 번호를 붙여 보내고 같은 줄 수로 받는다. */
  async function translate(cues, from, to) {
    const out = []; const N = 120;
    for (let i = 0; i < cues.length; i += N) {
      const part = cues.slice(i, i + N);
      if (!W3.live()) { part.forEach(c => out.push({ s: c.s, e: c.e, t: `[데모 번역 · ${LANGS[to]}] ${c.t}` })); continue; }
      const r = await api('POST', '/api/ai/messages', { model: 'claude-haiku-5-5', max: 4000, system: `당신은 대학 강의 자막 번역가입니다. ${LANGS[from]} 자막을 ${LANGS[to]}(${to})로 번역합니다. 입력은 JSON 배열(문자열)이며, 같은 길이 · 같은 순서의 JSON 문자열 배열만 출력합니다. 전문 용어는 정확히, 문장은 자막에 맞게 짧게 씁니다. 설명 · 코드 블록을 붙이지 마십시오.`,
        messages: [{ role: 'user', content: JSON.stringify(part.map(c => c.t)) }] });
      const txt = (r.content || []).filter(x => x.type === 'text').map(x => x.text).join('').trim().replace(/^```(?:json)?|```$/g, '');
      let arr; try { arr = JSON.parse(txt.slice(txt.indexOf('['), txt.lastIndexOf(']') + 1)); } catch (e) { throw new Error(`${LANGS[to]} 번역 결과를 읽지 못했습니다. 다시 시도하세요.`); }
      if (!Array.isArray(arr) || arr.length !== part.length) throw new Error(`${LANGS[to]} 번역 줄 수가 맞지 않습니다. 다시 시도하세요.`);
      part.forEach((c, k) => out.push({ s: c.s, e: c.e, t: String(arr[k] || '').slice(0, 500) || c.t }));
    }
    return out;
  }
  ACT['lmsv-tr'] = async () => {
    const set = (W3.cache['lmsv:list'] || {}).settings || {}; const tg = (V.tr || set.targets || []).filter(x => x !== V.capLang); if (!tg.length) { toast('번역할 언어를 고르세요.', 'warn'); return; }
    const cues = readCues(); let ok = 0;
    for (const to of tg) { V.trBusy = `${LANGS[to]} 번역 중…`; render();
      try { const tc = await translate(cues, V.capLang, to); await W3.call('POST', '/api/lms/v/caption', { media_id: V.sel, lang: to, cues: tc, source: 'translate', engine: W3.live() ? 'claude' : 'demo' }); ok++; }
      catch (e) { toast(e.code === 'ai_off' ? 'AI 키가 설정되지 않아 번역할 수 없습니다(설정 › AI).' : e.message, 'warn'); break; } }
    V.trBusy = null; W3.drop('lmsv:'); if (ok) toast(`${ok}개 언어 초안을 만들었습니다. 확인 뒤 언어별로 게시하세요.`, 'ok'); render();
  };

  /* ── 전송 설정: 우리 서버 ↔ CDN 원클릭 전환 · 재생 주소 유효 시간 · 허용 사이트 · 자막 언어 · 보존 기간 ── */
  function vSet() {
    const s = (W3.cache['lmsv:list'] || {}).settings || {}; const adm = isAdmin();
    return `<div class="lmsv-grid"><div class="card"><div class="ch"><b>영상 전송 위치</b>${tag(s.delivery === 'cdn' ? 'CDN' : '학교 서버(직접)', s.delivery === 'cdn' ? 'g' : '')}</div>
      <p class="lmsv-note">학교 서버: 스트리밍 경로(/api/lms/v/hls)가 캐시 머리말(조각 1일 · 변경 없음)을 붙여 직접 보냅니다. CDN: 같은 경로 앞에 CDN(운영은 Google Cloud CDN)을 두고 재생 주소를 CDN 주소로 냅니다 — 수강 신청 기간처럼 동시 접속이 많을 때 씁니다.</p>
      <div class="lmsv-row"><label>CDN 주소<input id="lmsvCdn" value="${esc(s.cdn_base || '')}" placeholder="https://vod.example.ac.kr" ${adm ? '' : 'disabled'}></label>
        <button class="btn ${s.delivery === 'cdn' ? '' : 'pri'}" data-act="lmsv-deliv" data-v="${s.delivery === 'cdn' ? 'origin' : 'cdn'}" ${adm ? '' : 'disabled'}>${s.delivery === 'cdn' ? '학교 서버로 전환' : 'CDN으로 전환'}</button></div>
      ${adm ? '' : '<p class="lmsv-note">운영자(정 · 부운영자)만 바꿀 수 있습니다.</p>'}</div>
      <div class="card"><div class="ch"><b>재생 주소 · 자막 · 보존</b></div>
      <div class="lmsv-row"><label>재생 주소 유효 시간(분)<input type="number" id="lmsvTtl" min="1" max="1440" value="${Math.round((s.ttl_sec || 3600) / 60)}" ${adm ? '' : 'disabled'}></label><label>녹화 · 영상 보존 기간(일)<input type="number" id="lmsvRet" min="30" max="3650" value="${s.retain_days || 365}" ${adm ? '' : 'disabled'}></label></div>
      <div class="lmsv-row"><label>허용 사이트(쉼표, 비우면 제한 없음)<input id="lmsvDoms" value="${esc((s.domains || []).join(', '))}" placeholder="eclass.jnu.ac.kr" ${adm ? '' : 'disabled'}></label><label>기본 음성 언어<select id="lmsvStl" ${adm ? '' : 'disabled'}>${Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${k === s.stt_lang ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <p class="lmsv-note">기본 번역 언어: ${(s.targets || []).map(x => esc(LANGS[x] || x)).join(' · ')} — 자막 탭에서 고를 수 있습니다(지원 ${Object.keys(LANGS).length}개 언어).</p>
      <div class="lmsv-row"><button class="btn pri" data-act="lmsv-setsave" ${adm ? '' : 'disabled'}>저장</button></div>
      <p class="lmsv-note">저장소: ${esc(s.storage_hint || '')} · 화질: ${(s.renditions || []).map(r => r.name).join(' · ')} H.264/AAC · 6초 조각</p></div></div>`;
  }
  ACT['lmsv-deliv'] = el => W3.act(() => W3.call('POST', '/api/lms/v/settings', { cdn_base: $('#lmsvCdn').value.trim(), delivery: el.dataset.v }), r => r.delivery === 'cdn' ? 'CDN으로 전환했습니다. 새 재생 주소부터 CDN으로 나갑니다.' : '학교 서버 직접 전송으로 전환했습니다.').then(r => { if (r) { W3.drop('lmsv:'); render(); } });
  ACT['lmsv-setsave'] = () => W3.act(() => W3.call('POST', '/api/lms/v/settings', { ttl_sec: Math.round(+$('#lmsvTtl').value * 60), retain_days: +$('#lmsvRet').value, domains: $('#lmsvDoms').value.split(',').map(x => x.trim()).filter(Boolean), stt_lang: $('#lmsvStl').value }), '저장했습니다.').then(r => { if (r) { W3.drop('lmsv:'); render(); } });
})();
