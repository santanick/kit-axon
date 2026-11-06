/* v32 미디어 재생 연결(스튜디오 · 학습자 앱 공용) — 콘텐츠 src가 「media:<영상 id>」이면 학교 서버 스트리밍(HLS)으로 재생한다.
   묶음 I 플레이어(lms/i.js · lms/gij-learner.js)는 <video data-media="media:…">만 그리고, 이 파일이 서명 주소(GET /api/lms/v/url)를 받아
   hls.js(cdnjs 고정 판) 또는 기기 내장 HLS(사파리)를 붙인다. 붙기 전에 플레이어가 부르는 currentTime · play()는 잠시 보관했다가 준비되면 적용한다
   → 이어보기 위치 · 10초 하트비트 · 진도 · 자동출석이 그대로 동작한다. 주소가 만료되면(기본 1시간) 새 주소로 이어서 받는다.
   데모(서버 없음): 이 브라우저에서 올리거나 녹화한 영상(DDMEDIA.blobs)만 재생, 그 밖은 기존 가상 영상으로 둔다. */
(function () {
  'use strict';
  const HLS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js';
  const M = window.DDMEDIA = window.DDMEDIA || {};
  M.blobs = M.blobs || {};
  const isMedia = s => typeof s === 'string' && /^media:[0-9a-fA-F-]{36}$/.test(s);
  const live = () => { try { if (typeof LIVE !== 'undefined' && LIVE && LIVE.user) return true; } catch (e) { } try { if (typeof LR === 'object' && LR && LR.mode === 'live') return true; } catch (e) { } return false; };
  M.isMedia = isMedia;
  M.playable = s => isMedia(s) && (live() || !!M.blobs[s.slice(6)]);
  let hlsP = null;
  M.loadHls = () => hlsP || (hlsP = new Promise((ok, no) => {
    if (window.Hls) return ok(window.Hls);
    const sc = document.createElement('script'); sc.src = HLS_URL; sc.async = true; sc.crossOrigin = 'anonymous';
    sc.onload = () => (window.Hls ? ok(window.Hls) : no(new Error('hls.js 없음'))); sc.onerror = () => { hlsP = null; no(new Error('재생기(hls.js)를 불러오지 못했습니다.')); };
    document.head.appendChild(sc);
  }));
  M.url = id => api('GET', '/api/lms/v/url?media_id=' + encodeURIComponent(id));
  const D = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  const note = (v, msg) => { let n = v.parentElement && v.parentElement.querySelector('.ddm-note'); if (!n && v.parentElement) { n = document.createElement('div'); n.className = 'ddm-note'; n.setAttribute('role', 'status'); n.style.cssText = 'position:absolute;left:8px;bottom:8px;right:8px;background:rgba(15,23,42,.8);color:#fff;font-size:12px;padding:6px 8px;border-radius:6px'; v.parentElement.appendChild(n); } if (n) n.textContent = msg; };

  /* 준비 전 위치 · 재생 요청 보관 */
  function hold(v) {
    const st = { ready: false, t: 0, play: false };
    Object.defineProperty(v, 'currentTime', { configurable: true, get() { return st.ready ? D.get.call(v) : st.t; }, set(x) { if (st.ready) D.set.call(v, x); else st.t = +x || 0; } });
    v.play = function () { if (st.ready) return HTMLMediaElement.prototype.play.call(v); st.play = true; return Promise.resolve(); };
    v.pause = function () { st.play = false; return HTMLMediaElement.prototype.pause.call(v); };
    st.release = () => { if (st.ready) return; st.ready = true; delete v.currentTime; delete v.play; delete v.pause; try { if (st.t) v.currentTime = st.t; } catch (e) { } if (st.play) v.play().catch(() => { }); };
    return st;
  }
  async function attach(v) {
    v.dataset.mon = '1'; const src = v.dataset.media; if (!isMedia(src)) return; const id = src.slice(6);
    /* 플레이어가 관찰자보다 먼저 재생 · 위치를 요청했을 수 있다(그린 직후 동기 호출) → 그 요청을 이어받는다 */
    const pre = { t: D.get.call(v) || 0, play: !v.paused };
    const st = hold(v); st.t = pre.t; st.play = pre.play; v.addEventListener('loadedmetadata', () => st.release(), { once: true });
    if (!live()) { if (M.blobs[id]) v.src = M.blobs[id]; else note(v, '데모: 이 브라우저에서 올린 영상만 재생됩니다.'); return; }
    let u; try { u = await M.url(id); } catch (e) { note(v, e.message || '재생 주소를 받지 못했습니다.'); return; }
    if (u.poster) v.poster = u.poster;
    if (v.canPlayType('application/vnd.apple.mpegurl')) { v.src = u.url; return; }
    let Hls; try { Hls = await M.loadHls(); } catch (e) { note(v, e.message); return; }
    if (!Hls.isSupported()) { note(v, '이 브라우저는 스트리밍 재생을 지원하지 않습니다.'); return; }
    const h = new Hls({ enableWorker: false, startPosition: st.t || -1, capLevelToPlayerSize: true }); v._hls = h; let retry = 0;
    h.on(Hls.Events.ERROR, async (ev, d) => {
      if (!d || !d.fatal) return;
      if (d.type === Hls.ErrorTypes.NETWORK_ERROR && retry < 3) { retry++; try { const n = await M.url(id); const t = v.currentTime; h.loadSource(n.url); h.startLoad(t); return; } catch (e) { /* 아래 안내 */ } }
      if (d.type === Hls.ErrorTypes.MEDIA_ERROR && retry < 3) { retry++; h.recoverMediaError(); return; }
      note(v, '영상을 불러오지 못했습니다. 새로 고침하거나 잠시 뒤 다시 시도하세요.');
    });
    h.loadSource(u.url); h.attachMedia(v);
  }
  /* 화질 선택(묶음 I의 「화질」 목록): auto · 360p · 720p → hls 단계 */
  M.setQuality = (v, q) => { const h = v && v._hls; if (!h) return; if (!q || q === 'auto') { h.currentLevel = -1; return; } const n = parseInt(q, 10); const i = h.levels.findIndex(l => l.height === n); if (i >= 0) h.currentLevel = i; };
  /* x2 실시간 수업 음성 후처리 훅: 서버 작업기(lms/media/worker.js · LmsVWorker)가 lms_live_cap_audio(hook 'lmsVodSubtitleJob')를 30초 안에 집어
     같은 STT 어댑터(Whisper)로 처리하고 결과(cues)를 그 행의 result에 남긴다. 화면에서는 접수만 확인한다. */
  window.lmsVodSubtitleJob = job => { const j = job || {}; M.liveJobs = M.liveJobs || []; M.liveJobs.push({ job_id: j.job_id, lang: j.lang, at: Date.now() });
    return { job_id: j.job_id || null, status: j.status || 'queued', pipeline: 'lms/v', engine: live() ? 'server-stt' : 'demo', note: '학교 서버 음성 인식이 30초 안에 처리합니다.' }; };
  const scan = root => { (root.querySelectorAll ? root.querySelectorAll('video[data-media]:not([data-mon])') : []).forEach(v => attach(v)); };
  const mo = new MutationObserver(ms => { for (const m of ms) { m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.matches && n.matches('video[data-media]:not([data-mon])')) attach(n); else scan(n); } });
    m.removedNodes.forEach(n => { if (n.nodeType !== 1) return; const vs = n.matches && n.matches('video') ? [n] : [...(n.querySelectorAll ? n.querySelectorAll('video') : [])]; vs.forEach(v => { if (v._hls) { v._hls.destroy(); v._hls = null; } }); }); } });
  const go = () => { mo.observe(document.documentElement, { childList: true, subtree: true }); scan(document); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  document.addEventListener('change', e => { const s = e.target; if (s && s.matches && s.matches('select[aria-label="화질"]')) { const v = document.querySelector('video[data-media]'); M.setQuality(v, s.value); } });
})();
