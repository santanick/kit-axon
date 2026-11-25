/* GS #20 오류 문구 — errMsg(e, fallback)
   화면에 보이는 오류는 모두 이 함수를 거칩니다.
   - 서버가 보낸 한국어 문구(HttpErr message)는 그대로 씁니다(학습자 화면은 '-십시오'를 해요체로 바꿉니다).
   - 예외 클래스명 · 스택 · 영문 원문 · SQL · 내부 주소는 보이지 않게 막고, 오류 코드 · HTTP 상태로 한국어 문구를 고릅니다.
   - fallback을 주면(빈 문자열 포함) 안전한 문구가 없을 때 그 값을 돌려줍니다. 주지 않으면 공통 안내문을 돌려줍니다.
   말투: 운영자 화면 합니다체, 학습자 화면(script 태그 data-tone="lr" 또는 learner · liveclass 주소) 해요체. */
(function () {
  'use strict';
  const cur = document.currentScript;
  const TONE = (cur && cur.dataset && cur.dataset.tone) || (/learner|liveclass/.test(location.pathname) ? 'lr' : 'op');
  const HANGUL = /[가-힣]/;
  const LEAK = /(\b[A-Z][A-Za-z]*(Error|Exception)\b|\bat\s+[\w$.<>]+\s*\(|\n\s+at\s|[\w/.-]+\.(js|java|ts):\d+|Cannot read|is not (a function|defined|iterable)|undefined|\bnull\b|NaN|Unexpected (token|end)|JSON\.|\bSQL|\bselect\s.+\bfrom\b|relation "|column "|duplicate key|violates|ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ERR_[A-Z_]+|Failed to fetch|NetworkError|Load failed|https?:\/\/|\bsk-[A-Za-z0-9]|[{}<>]|\bstack\b|\b(TypeError|DOMException)\b)/;
  const M = {
    op: {
      net: '네트워크에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도하십시오.',
      timeout: '응답이 늦어 요청을 멈췄습니다. 잠시 후 다시 시도하십시오.',
      abort: '요청을 취소했습니다.',
      400: '입력한 내용을 확인하십시오.',
      401: '로그인이 끝났습니다. 다시 로그인하십시오.',
      403: '이 작업을 할 권한이 없습니다.',
      404: '찾는 항목이 없습니다. 화면을 새로 고친 뒤 다시 시도하십시오.',
      409: '다른 곳에서 먼저 바뀌었습니다. 최신 내용을 불러온 뒤 다시 시도하십시오.',
      413: '파일이나 내용이 너무 큽니다. 크기를 줄여 다시 시도하십시오.',
      422: '처리할 수 있는 내용이 없습니다. 입력을 확인하십시오.',
      429: '요청이 많습니다. 잠시 후 다시 시도하십시오.',
      500: '서버 오류가 발생했습니다. 잠시 후 다시 시도하십시오.',
      502: '연결된 외부 서비스가 응답하지 않습니다. 잠시 후 다시 시도하십시오.',
      503: '서비스를 잠시 사용할 수 없습니다. 잠시 후 다시 시도하십시오.',
      501: '아직 연결되지 않은 기능입니다. 관리자에게 문의하십시오.',
      dflt: '요청을 처리하지 못했습니다. 잠시 후 다시 시도하십시오.',
      code: {
        auth: '로그인이 필요합니다. 다시 로그인하십시오.', csrf: '허용되지 않은 요청입니다. 화면을 새로 고친 뒤 다시 시도하십시오.', origin: '허용되지 않은 요청입니다. 화면을 새로 고친 뒤 다시 시도하십시오.',
        server: '서버 오류가 발생했습니다. 잠시 후 다시 시도하십시오.', not_found: '찾는 항목이 없습니다.', conflict: '다른 창이나 운영자가 먼저 저장했습니다. 최신 내용을 불러옵니다.',
        rate: '요청이 많습니다. 잠시 후 다시 시도하십시오.', locked: '로그인에 여러 번 실패해 잠시 잠겼습니다. 잠시 후 다시 시도하십시오.', ai_off: 'AI 연결이 아직 설정되지 않았습니다.',
        plan_feature: '현재 요금제에서 쓸 수 없는 기능입니다. 설정 › 요금제에서 확인하십시오.', ai_month_quota: '이번 달 AI 사용량을 모두 썼습니다. 설정 › AI에서 확인하십시오.', trial_ended: '무료 체험 기간(14일)이 끝나 AI 월 포함량이 0입니다. 설정 → AI 사용량에서 추가 충전하거나 유료 요금제로 전환하십시오.',
        geo_blocked: '허용되지 않은 접속 위치입니다.', ip: '허용되지 않은 접속 위치입니다.', media_demo: '시연 화면에서는 파일을 올릴 수 없습니다.', sdk: '결제 창을 열 수 없습니다. 잠시 후 다시 시도하십시오.'
      }
    },
    lr: {
      net: '인터넷에 연결하지 못했어요. 연결을 확인하고 다시 시도해 주세요.',
      timeout: '응답이 늦어 요청을 멈췄어요. 잠시 후 다시 시도해 주세요.',
      abort: '요청을 취소했어요.',
      400: '입력한 내용을 확인해 주세요.',
      401: '로그인이 끝났어요. 다시 로그인해 주세요.',
      403: '이 기능은 사용할 수 없어요.',
      404: '찾는 내용이 없어요. 새로 고친 뒤 다시 시도해 주세요.',
      409: '다른 곳에서 먼저 바뀌었어요. 새로 고친 뒤 다시 시도해 주세요.',
      413: '파일이 너무 커요. 크기를 줄여 다시 올려 주세요.',
      422: '처리할 내용이 없어요. 입력을 확인해 주세요.',
      429: '요청이 많아요. 잠시 후 다시 시도해 주세요.',
      500: '서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
      502: '연결된 서비스가 응답하지 않아요. 잠시 후 다시 시도해 주세요.',
      503: '지금은 사용할 수 없어요. 잠시 후 다시 시도해 주세요.',
      501: '아직 준비 중인 기능이에요. 기관에 문의해 주세요.',
      dflt: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
      code: {
        auth: '로그인이 필요해요. 다시 로그인해 주세요.', csrf: '새로 고친 뒤 다시 시도해 주세요.', origin: '새로 고친 뒤 다시 시도해 주세요.',
        server: '서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.', not_found: '찾는 내용이 없어요.', conflict: '다른 곳에서 먼저 바뀌었어요. 새로 고친 뒤 다시 시도해 주세요.',
        rate: '요청이 많아요. 잠시 후 다시 시도해 주세요.', locked: '로그인에 여러 번 실패해 15분 동안 잠겼어요. 잠시 후 다시 시도해 주세요.', ai_off: 'AI 튜터가 아직 준비되지 않았어요.',
        ai_month_quota: '이번 달 AI 사용량을 모두 썼어요. 선생님께 질문 넘기기를 이용해 주세요.', trial_ended: '무료 체험 기간이 끝나 지금은 AI를 쓸 수 없어요. 선생님께 질문 넘기기를 이용해 주세요.', geo_blocked: '허용되지 않은 접속 위치예요.', ip: '허용되지 않은 접속 위치예요.',
        media_demo: '체험 화면에서는 파일을 올릴 수 없어요.', sdk: '결제창을 열 수 없어요. 잠시 후 다시 시도해 주세요.'
      }
    }
  };
  /* 학습자 화면: 서버 문구의 '-십시오'를 해요체로 */
  const soft = s => s.replace(/하십시오/g, '해 주세요').replace(/주십시오/g, '주세요').replace(/십시오/g, '세요');
  const safe = s => typeof s === 'string' && s.trim() && s.length <= 300 && HANGUL.test(s) && !LEAK.test(s) && !/^오류 \d{3}$/.test(s.trim());
  function errMsg(e, fallback, tone) {
    const T = M[tone || TONE] || M.op;
    const out = s => (tone || TONE) === 'lr' ? soft(s) : s;
    if (e == null) return fallback !== undefined ? fallback : T.dflt;
    if (typeof e === 'string') return safe(e) ? out(e) : (T.code[e] || (fallback !== undefined ? fallback : T.dflt));
    const msg = typeof e.message === 'string' ? e.message : '';
    const code = typeof e.code === 'string' ? e.code : '';
    if (safe(msg)) return out(msg.trim());
    if (code && T.code[code]) return T.code[code];
    const name = String(e.name || '');
    if (name === 'AbortError') return T.abort;
    if (name === 'TimeoutError' || /timed? ?out|시간 초과/i.test(msg)) return T.timeout;
    if (!e.status && (name === 'TypeError' && /fetch|network|load failed/i.test(msg) || /Failed to fetch|NetworkError|Load failed|ERR_NETWORK|ERR_INTERNET/i.test(msg))) return T.net;
    if (fallback !== undefined) return fallback;
    const st = +e.status || +(/^오류 (\d{3})$/.exec(msg.trim()) || [])[1] || 0;
    if (st) return T[st] || (st >= 500 ? T[500] : T[400]);
    return T.dflt;
  }
  window.errMsg = errMsg;
  window.ERRMSG = { M, safe, TONE };
})();
