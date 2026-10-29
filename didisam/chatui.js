/* 디디쌤 스튜디오 v7 — AI SAM 대화창 디자인: 머리(엔진 · 모델) · 빈 화면 추천 카드 · 말풍선 · 입력창 */
'use strict';
const SUGI = ['chart', 'spark', 'check', 'arrow'];
{ const base = threadHTML; threadHTML = () => { if (S.chat.length) return base();
  const L = EXQ[S.org.type].slice(0, 4);
  return `<div class="tempty2"><span class="orb lg">${ic('spark', 26)}</span><b>무엇을 도와드릴까요?</b><p>현황 조회 · 메시지 발송 · 과정 설계 · 문서 작성 · 자동화까지 말로 지시하세요.<br>실행이 필요한 일은 계획을 먼저 보여 드리고, 승인하신 뒤에 처리합니다.</p>
    <div class="tsug">${L.map((x, i) => `<button type="button" data-act="chat-q" data-v="${esc(x)}"><i>${ic(SUGI[i % 4], 16)}</i><span>${esc(x)}</span></button>`).join('')}</div></div>`; }; }
{ const base = VIEWS.home; VIEWS.home = () => base().replace('<section class="chatwrap">', `<section class="chatwrap"><div class="chd"><span class="orb">${ic('spark', 18)}</span><div><b>AI SAM</b><small>${esc(S.org.name)} 운영 비서</small></div><span class="sp"></span>${clBadge()}${S.chat.length ? `<button class="btn sm ghost" data-act="chat-clear" title="대화 지우기">새 대화</button>` : ''}</div>`); }
ACT['chat-clear'] = () => { S.chat = []; save(); render(); renderThreads(); };
/* 서랍 머리 */
{ const base = ACT['chat-open']; ACT['chat-open'] = el => { const had = $('#drawer'); base(el); const d = $('#drawer'); if (!d || had) return; const av = d.querySelector('.dh .av'); if (av) av.outerHTML = `<span class="orb">${ic('spark', 16)}</span>`; d.querySelector('.dh div')?.insertAdjacentHTML('afterend', `<span class="dheng">${clBadge()}</span>`); }; }
/* 입력창 아래 안내: 엔진 상태 */
{ const base = composer; composer = where => base(where).replace(/<small class="cnote">[\s\S]*?<\/small>/, `<small class="cnote"><span><kbd>Enter</kbd> 보내기</span><span><kbd>Shift+Enter</kbd> 줄바꿈</span><span>${CL.on('chat') ? `${esc(CL.label())} 연결됨` : '규칙 엔진(데모)'}</span><span>실행은 승인 후</span></small>`).replace(/placeholder="[^"]*"/, 'placeholder="AI SAM에게 무엇이든 지시하세요"'); }
