/* 디디쌤 스튜디오 v26.1 — 화면마다 '가이드 보기'(피그마 스튜디오 머리의 [가이드 보기] 버튼 벤치마크)
   누르면 오른쪽에서 가이드 패널이 열린다: 이 화면은 · 이 화면에서 할 수 있는 일(바로 맡기기) · 따라 하기(단계형 가이드) · 용어 · 자주 묻는 질문 · 전체 문서 · AI SAM에게 묻기 */
'use strict';
const G26 = () => { const L = t('learner'), C = t('cls'), G = t('group');
  return {
    dash: { terms: [['평균 수료율', `수료 기준(진도 %)을 넘은 ${L} 비율입니다.`], ['수강 가능', '모집 · 판매 중이라 지금 신청할 수 있는 상태입니다.']], faq: [['숫자는 언제 바뀌나요?', `${L}${AI.j(L, '이')} 학습하거나 결제하면 바로 다시 계산됩니다. 화면 위 '수집 기준 시각'이 마지막 계산 시각입니다.`], ['엑셀로 받을 수 있나요?', "오른쪽 위 '운영 현황 엑셀로 내려받기'를 누르면 CSV로 받습니다."]] },
    class: { terms: [[`기간 ${C}`, '수강 시작 후 N일 또는 정해진 날짜 동안 온라인으로 듣습니다.'], [`회차 ${C}`, '요일반 · 특강반처럼 정해진 일정(회차)으로 운영합니다.'], [`구독 ${C}`, '매월 같은 날 자동 결제되고, 해지 전까지 계속 수강합니다.'], ['수료 기준', '진도 · 시험 · 과제 조건을 모두 채우면 수료로 표시됩니다.']], faq: [[`${C}${AI.j(C, '을')} 처음 만들면 바로 보이나요?`, `'공개'로 바꾸고 사이트를 게시하면 ${L} 화면에 보입니다.`], ['수강 기간을 늘려 줄 수 있나요?', `${C} 상세 › ${L} 탭에서 고른 사람만 '수강 기간 연장'을 누르세요.`], ['결제 링크는 어디 있나요?', `유료 ${C} 상세 머리의 '결제 링크 복사' 또는 '공유하기'를 쓰세요.`]] },
    members: { terms: [['정회원', '가입을 마쳐 모든 기능을 쓰는 회원입니다.'], ['준회원', '본인 확인 전 · 일괄 가입 등으로 일부 기능만 쓰는 회원입니다.'], ['승인 대기', '운영자 승인 후에 홈페이지를 이용할 수 있습니다.']], faq: [['개인정보는 어디까지 보이나요?', '닉네임과 가린 이메일만 보입니다. 수료증 · 환불 같은 목적이 있을 때만 정운영자가 열람하고 기록이 남습니다.'], ['여러 명에게 한 번에 메시지를 보내려면?', "체크박스로 고른 뒤 '메시지 발송'을 누르세요."], ['탈퇴 회원은 어디 있나요?', "상세검색에서 '탈퇴 회원 보기'를 켜면 보입니다(개인정보는 이미 삭제됨)."]] },
    enroll: { terms: [['초대 링크', `받은 사람이 바로 가입해 ${L}${AI.j(L, '이')} 되는 주소입니다.`], ['일괄 등록', '엑셀 명단을 한 번에 올려 계정을 만듭니다.']], faq: [['명단 양식은 어디 있나요?', "'일괄 등록'을 누르면 양식을 내려받을 수 있습니다."]] },
    site: { terms: [['게시', '고친 내용을 실제 사이트에 반영하는 것입니다. 게시 전에는 미리보기에만 보입니다.'], ['섹션', '첫 화면 · 강좌 · 후기처럼 페이지를 이루는 덩어리입니다.']], faq: [['AI로 만든 뒤 고칠 수 있나요?', "'화면에서 바로 고치기'에서 글자를 눌러 바로 고칩니다. 되돌리기도 됩니다."], ['메뉴 순서를 바꾸려면?', "'메뉴 편성'에서 끌어 놓거나 ↑ ↓ 버튼을 쓰세요."]] },
    sales: { terms: [['정산', 'PG(토스페이먼츠)가 결제금에서 수수료를 빼고 기관 계좌로 보내는 것입니다.'], ['환불 신청', `${L}${AI.j(L, '이')} 신청하면 '환불 승인' 전까지 대기 상태입니다.`]], faq: [['환불은 어떻게 하나요?', "환불 신청 줄에서 '승인'을 누르면 PG로 취소 요청이 갑니다."]] },
    message: { terms: [['알림톡', '카카오톡으로 가는 안내 메시지입니다(휴대폰 동의자만).'], ['앱 메시지', `${L} 사이트 알림함(종 아이콘)으로 보냅니다.`]], faq: [['보호자에게도 보낼 수 있나요?', "'연결된 보호자에게도'를 켜면 함께 보냅니다."]] },
    community: { terms: [['게시판 권한', '읽기 · 쓰기를 전체 · 수강생 · 지정 회원으로 나눌 수 있습니다.']], faq: [['질문에 답하면 알림이 가나요?', '네, 질문한 사람에게 알림이 갑니다.']] },
    auto: { terms: [['자동화 규칙', '조건이 맞으면 정해진 일을 자동으로 하는 규칙입니다(예: 14일 미접속 → 독려 메시지).']], faq: [['마음대로 실행되지 않나요?', '실행 전에는 항상 계획을 보여 드리고 승인받습니다.']] },
    badge: { terms: [['발급 번호', '배지마다 붙는 고유 번호입니다. 진위 확인 · 대장 관리에 씁니다.'], ['영구 인증', '만료일이 없는 배지입니다. 상세검색에서 영구 인증만 골라 볼 수 있습니다.'], ['해제', '잘못 발급한 배지를 무효로 돌리는 것입니다(취소 불가 정책이면 막힘).']], faq: [['발급 내역을 엑셀로 받을 수 있나요?', "발급 현황 오른쪽 '발급 대장 CSV'를 누르세요."], ['여러 명에게 한 번에 발급하려면?', "머리의 '배지 발급하기'(수동 발급)에서 대상을 골라 발급합니다."]] },
    consult: { terms: [['요약 상태', '요약 전 · 진행 중 · 요약 완료로 AI 요약 진행 단계를 보여 줍니다.'], ['녹음파일', '대면 상담 녹음 원본입니다. 텍스트 변환 중에는 등록 중으로 표시됩니다.']], faq: [['채널톡 상담도 모이나요?', "설정 탭에서 채널톡을 연동한 뒤 '상담 내역 불러오기'를 누르면 목록에 들어옵니다."], ['상담 기록을 지울 수 있나요?', '저장된 상담 내역은 삭제 · 공유할 수 없습니다.']] },
    book: { terms: [['다운로드 기간', '전자책을 결제한 날부터 다시 받을 수 있는 기간입니다(교재별 설정).'], ['비공개', '새로 판매되지 않지만, 이미 산 사람은 계속 받거나 전달받을 수 있습니다.']], faq: [['교재를 지울 수 없어요.', '다운로드 기간이 남은 전자책, 결제/신청한 사람이 있는 실물 교재는 삭제할 수 없습니다. 비공개로 바꾸세요.'], ['파일을 바꿀 수 없어요.', '다운로드 권한을 가진 사람이 있으면 전자책 유형 · 파일은 바꿀 수 없습니다.']] },
    settings: { terms: [['정운영자', '요금제 · 개인정보 열람 같은 중요한 설정을 바꿀 수 있는 대표 계정입니다.']], faq: [['설정은 어디까지 바꿀 수 있나요?', '기관 정보 · 가입 · 결제 · 알림 · 용어를 바꿀 수 있습니다. 바꾸면 바로 반영됩니다.']] }
  }; };
const g26Key = () => (CUR.ws === 'home' ? 'home' : CUR.tab || CUR.ws || '');
function g26HTML() { const k = g26Key(); const P = G26()[k] || {}; const desc = (typeof UX_DESC === 'function' && UX_DESC()[k]) || '';
  const name = (typeof scxLabel === 'function' && scxLabel(k)) || (document.querySelector('#main .bhdl b, #main h1') || {}).textContent || '이 화면';
  const chips = typeof scxChips === 'function' ? scxChips(k) : [];
  const gs = (typeof GUIDES !== 'undefined' ? GUIDES : []).filter(g => (!g.role || g.role === 'admin' || (typeof scn === 'function' && scn() === 'teacher' && g.role === 'teacher')) && (g.steps || []).some(s => s.go === k)).slice(0, 2);
  const T = v => typeof v === 'function' ? v() : v; const doc = (document.querySelector('#main .gref') || {}).href || 'https://didisam.gitbook.io/guide-new-ver/';
  return `<div class="g26h"><div><small>화면 가이드</small><h2>${esc(name)}</h2></div><button type="button" class="g26x" data-act="g26-close" aria-label="가이드 닫기">${ic('x', 18)}</button></div>
  <div class="g26b">${desc ? `<p class="g26lead">${esc(desc)}</p>` : ''}
    ${chips.length ? `<section><h3>${ic('spark', 15)} 이 화면에서 할 수 있는 일</h3><ul class="g26do">${chips.map(c => `<li><span>${esc(c.l)}</span><button type="button" class="btn sm ai" data-act="g26-run" data-v="${esc(c.id)}">맡기기</button></li>`).join('')}</ul><p class="mini">맡기면 계획을 먼저 보여 드리고, 승인하면 실행합니다.</p></section>` : ''}
    ${gs.map(g => `<section><h3>${ic('check', 15)} 따라 하기 — ${esc(T(g.title))} <small>${g.mins ? `약 ${g.mins}분` : ''}</small></h3><ol class="g26st">${g.steps.map(s => `<li class="${s.go === k ? 'here' : ''}"><b>${esc(T(s.t))}</b><small>${esc(String(T(s.d) || '')).slice(0, 110)}</small></li>`).join('')}</ol><button type="button" class="btn sm pri" data-act="g26-guide" data-v="${esc(g.id)}">이 가이드 따라 하기</button></section>`).join('')}
    ${(P.terms || []).length ? `<section><h3>${ic('book', 15)} 용어</h3><dl class="g26dl">${P.terms.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl></section>` : ''}
    ${(P.faq || []).length ? `<section><h3>${ic('chat', 15)} 자주 묻는 질문</h3>${P.faq.map(([q, a]) => `<details class="g26q"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>` : ''}
  </div>
  <div class="g26f"><a class="btn" href="${esc(doc)}" target="_blank" rel="noopener">${ic('book', 15)} 전체 가이드 문서</a><button type="button" class="btn pri" data-act="g26-ask">${ic('spark', 15)} AI SAM에게 묻기</button></div>`; }
function g26Open() { g26Close(true); const w = document.createElement('aside'); w.id = 'g26'; w.className = 'g26'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', '화면 가이드'); w.innerHTML = g26HTML(); document.body.appendChild(w); document.body.classList.add('g26-on'); setTimeout(() => w.querySelector('.g26x') && w.querySelector('.g26x').focus(), 30); UI.g26 = g26Key(); }
function g26Close(silent) { const w = document.getElementById('g26'); if (w) w.remove(); document.body.classList.remove('g26-on'); if (!silent) UI.g26 = null; }
ACT['g26-open'] = () => g26Open();
ACT['g26-close'] = () => g26Close();
ACT['g26-run'] = el => { const c = (typeof scxChips === 'function' ? scxChips(g26Key()) : []).find(x => x.id === el.dataset.v); g26Close(); if (c && typeof chatSend === 'function') { try { fabOpen && fabOpen(false); } catch (e) { } chatSend(c.l); } };
ACT['g26-guide'] = el => { g26Close(); ACT['gd-start'] && ACT['gd-start'](el); };
ACT['g26-ask'] = () => { const k = g26Key(); g26Close(); try { fabOpen && fabOpen(); } catch (e) { } const n = (typeof scxLabel === 'function' && scxLabel(k)) || '이 화면'; typeof chatSend === 'function' && chatSend(`${n} 화면 사용법을 쉽게 알려줘`); };
addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('g26')) { e.stopPropagation(); g26Close(); } }, true);
AFTER.push(() => { try {
  if (!S || !S.org || CUR.ws === 'home' && !CUR.tab) { g26Close(true); return; }
  const w = document.getElementById('g26'); if (w && UI.g26 && UI.g26 !== g26Key()) g26Close(true); else if (w) w.innerHTML = g26HTML();
  const phr = document.querySelector('#main .ph .phr'); if (!phr || phr.querySelector('[data-act=g26-open]')) return;
  phr.insertAdjacentHTML('afterbegin', `<button type="button" class="btn g26btn" data-act="g26-open">${ic('book', 15)} 가이드 보기</button>`);
} catch (e) { console.error(e); } });
