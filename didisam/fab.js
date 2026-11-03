/* 디디쌤 스튜디오 v19 — AI SAM 플로팅 위젯(채널톡형)
   대표님 요청(2026-11-02): 'AI SAM을 누르면 화면 위에서 열리고, 화면을 같이 보면서 고치고, 버튼을 누르면 커져서 바로 쓸 수 있게'.
   - 오른쪽 아래 'AI SAM' 버튼 → 화면 위에 작은 대화창(뒤 화면은 그대로 보이고 누를 수 있음)
   - 대화창 머리: 크게/작게 · 옆에 고정(예전 왼쪽 대화 열) · 닫기 / 고정 상태에서는 '띄우기'로 되돌림
   - 'AI SAM에게 맡기기' 등 지시를 보내는 버튼 · 레일의 AI SAM · Ctrl/⌘+K는 대화창을 연다. Esc로 닫음
   - 860px 이하(휴대폰)는 기존 '대화 / 미리보기' 전환을 그대로 쓴다
   설정은 이 브라우저에만 저장(didisam.fab: mode float|dock · size s|l · open) */
'use strict';
const FAB = { K: 'didisam.fab',
  get() { const d = { mode: 'float', size: 's', open: false }; try { return { ...d, ...JSON.parse(localStorage.getItem(this.K) || '{}') }; } catch (e) { return d; } },
  set(p) { try { localStorage.setItem(this.K, JSON.stringify({ ...this.get(), ...p })); } catch (e) {} fabSync(); } };
const FABI = { big: 'M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7', small: 'M4 14h6v6M3 21l7-7M20 10h-6V4M21 3l-7 7', dock: 'M4 4h16v16H4zM10 4v16', float: 'M4 4h16v16H4zM12 12h6v6h-6z' };
const fabSvg = (k, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${FABI[k]}"/></svg>`;
const fabWide = () => innerWidth > 860;
const fabBld = () => document.body.classList.contains('mode-bld');
/* v25.2 대표님(2026-11-03) '모바일에서는 AI SAM 챗봇이 없자나?' → 휴대폰(빌드 화면)도 같은 떠 있는 버튼, 대화창은 전체 화면 시트(고정 모드 없음) */
const fabOn = () => (fabWide() ? FAB.get().mode === 'float' : fabBld()) && !!(typeof S !== 'undefined' && S && S.org) && !document.body.classList.contains('mode-learner');
const fabIsOpen = () => fabBld() ? FAB.get().open : !!$('#drawer');
function fabSync() { const f = FAB.get(), on = fabOn(), open = on && fabIsOpen(), B = document.body.classList;
  B.toggle('fab-on', on); B.toggle('fab-open', open); B.toggle('fab-l', on && f.size === 'l' && fabWide()); B.toggle('fab-m', on && !fabWide());
  if (on && !fabWide()) { UI.uxPane = 'pv'; if (!B.contains('b-pv')) B.add('b-pv'); }
  let b = $('#fabBtn');
  if (!on) b && b.remove();
  else { if (!b) { document.body.insertAdjacentHTML('beforeend', '<button type="button" id="fabBtn" data-act="fab-toggle"></button>'); b = $('#fabBtn'); }
    b.setAttribute('aria-expanded', String(open)); b.setAttribute('aria-label', open ? 'AI SAM 닫기' : 'AI SAM 열기'); b.title = open ? '닫기 (Esc)' : 'AI SAM 열기 (Ctrl+K)';
    const busy = typeof S !== 'undefined' && S.chat && S.chat.some(m => m.typing);
    if (open) UI.fabNew = 0;
    b.innerHTML = open ? ic('x', 22) : `${ic('spark', 22)}<span>AI SAM</span>${UI.fabNew ? `<em class="fabn">${UI.fabNew}</em>` : busy ? '<i class="fabdot"></i>' : ''}`; }
  /* 대화창 머리 버튼 */
  document.querySelectorAll('.bch, #drawer .dh').forEach(h => { let c = h.querySelector('.fabc'); if (!c) { h.insertAdjacentHTML('beforeend', '<span class="fabc"></span>'); c = h.querySelector('.fabc'); }
    const inDrawer = h.classList.contains('dh');
    if (on && !fabWide()) { c.innerHTML = inDrawer ? '' : `<button type="button" class="fbi fbx" data-act="fab-close" title="닫기" aria-label="AI SAM 닫기">${ic('x', 20)}</button>`; return; }
    c.innerHTML = on ? `<button type="button" class="fbi" data-act="fab-size" title="${f.size === 'l' ? '작게 보기' : '크게 보기'}" aria-label="${f.size === 'l' ? '작게 보기' : '크게 보기'}">${fabSvg(f.size === 'l' ? 'small' : 'big')}</button>${fabBld() ? `<button type="button" class="fbi" data-act="fab-mode" data-v="dock" title="왼쪽에 고정" aria-label="왼쪽에 고정">${fabSvg('dock')}</button>` : ''}${inDrawer ? '' : `<button type="button" class="fbi" data-act="fab-close" title="닫기 (Esc)" aria-label="닫기">${ic('x', 16)}</button>`}`
      : (fabWide() && fabBld() ? `<button type="button" class="fbi" data-act="fab-mode" data-v="float" title="화면 위에 띄우기" aria-label="화면 위에 띄우기">${fabSvg('float')}</button>` : ''); });
}
function fabOpen(focus = true) { if (!fabOn()) return false;
  if (fabBld()) { if (!FAB.get().open) FAB.set({ open: true }); else fabSync(); }
  else if (CUR.ws === 'home') { const ta = $('.chatwrap textarea'); if (ta) { ta.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (focus) ta.focus(); } return true; } /* 클래식 홈은 대화가 화면 본문 */
  else if (!$('#drawer')) { ACT['chat-open'] && ACT['chat-open'](); }
  if (focus) setTimeout(() => { const ta = $(fabBld() ? '.bchat textarea' : '#drawer textarea'); ta && ta.focus(); const th = $('.bchat .thread'); if (th) th.scrollTop = th.scrollHeight; }, 60); return true; }
function fabClose() { if (fabBld()) FAB.set({ open: false }); else ACT['chat-close'] && ACT['chat-close']({}); fabSync(); $('#fabBtn')?.focus(); }
ACT['fab-toggle'] = () => fabIsOpen() ? fabClose() : fabOpen();
ACT['fab-close'] = () => fabClose();
ACT['fab-size'] = () => { FAB.set({ size: FAB.get().size === 'l' ? 's' : 'l' }); const th = $('.bchat .thread'); if (th) th.scrollTop = th.scrollHeight; };
ACT['fab-mode'] = el => { const v = el.dataset.v === 'dock' ? 'dock' : 'float'; FAB.set({ mode: v, open: true }); toast(v === 'dock' ? 'AI SAM을 왼쪽에 고정했습니다. 머리의 띄우기 버튼으로 되돌릴 수 있습니다.' : 'AI SAM을 화면 위에 띄웠습니다. 오른쪽 아래 버튼으로 열고 닫습니다.', 'ok'); };
/* 대화창을 여는 기존 경로를 위젯으로 */
/* v21 대표님 '어떤 걸 클릭할 때마다 AI SAM이 열려 불편' → 대화창은 사람이 연 경우(버튼 · Ctrl+K · 대화창 열기 버튼 클릭)에만 연다.
   화면 이동 · 맡기기 · 단계 진행 같은 프로그램 호출(el 없음)은 열지 않고, 답이 오면 버튼에 새 답 표시 + 알림 */
{ const base = ACT['chat-open']; ACT['chat-open'] = el => { if (fabOn() && fabBld()) { if (el && el.nodeType === 1) fabOpen(); return; } base(el); fabSync(); }; }
{ const base = ACT['chat-close']; ACT['chat-close'] = el => { base(el); fabSync(); }; }
{ const base = chatSend; chatSend = async q => { const was = fabOn() && fabIsOpen(); const p = base(q); setTimeout(fabSync, 50); try { return await p; } finally { if (fabOn() && !was && !fabIsOpen() && String(q || '').trim() && !document.body.classList.contains('aih-on')) { /* v24: 홈 'AI 비서' 화면에서는 답이 화면에 바로 보이므로 알림 없음 */ UI.fabNew = (UI.fabNew || 0) + 1; toast('AI SAM이 답했습니다 — 오른쪽 아래 AI SAM을 눌러 확인하세요.', 'ok'); } fabSync(); } }; }
AFTER.push(() => fabSync());
addEventListener('resize', () => fabSync());
addEventListener('keydown', e => { if (!fabOn()) return;
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); fabIsOpen() ? fabClose() : fabOpen(); }
  else if (e.key === 'Escape' && fabBld() && FAB.get().open && !$('.mwrap')) fabClose(); });
/* v25.2 휴대폰: 예전 '대화' 탭으로 가던 경로(화면 전환 클래스 제거)는 화면을 유지하고, 대화는 떠 있는 버튼으로만 연다. 새로고침 때 시트를 펼친 채 시작하지 않는다. */
if (innerWidth <= 860 && FAB.get().open) { try { localStorage.setItem(FAB.K, JSON.stringify({ ...FAB.get(), open: false })); } catch (e) { } }
new MutationObserver(() => { const B = document.body.classList; if (B.contains('fab-m') && !B.contains('b-pv') && fabOn()) B.add('b-pv'); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
ACT['bld-pane'] && (() => { const base = ACT['bld-pane']; ACT['bld-pane'] = el => { if (fabOn() && !fabWide()) { el && el.dataset && el.dataset.v === 'chat' ? fabOpen() : fabClose(); return; } base(el); }; })();
