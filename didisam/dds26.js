/* 디디쌤 스튜디오 v26 — 피그마(스튜디오 · 클래스 관리 상세) 대조 보강
   - 클래스 상세 머리: '수강생 화면 보기'(학습자 사이트의 이 클래스 페이지를 새 창으로) · '공유하기'(클래스 주소 복사, 무료 클래스도) · 카테고리 표시(미지정이면 '카테고리 미지정' → 누르면 설정 탭)
   - 클래스 상세 수강생 표 아래: '수료율 집계 일시'(마지막 계산 시각) */
'use strict';
Object.assign(IC, { play: IC.play || '<path d="M7 5v14l11-7z"/>', doc: IC.doc || '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>', download: IC.download || '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', award: IC.award || '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>', info: IC.info || '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>', folder: IC.folder || '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', eye: IC.eye || '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', link: IC.link || '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>' });
const d26ClsURL = c => (typeof c2PayLink === 'function' ? c2PayLink(c) : `learner.html#class/${c.id}`);
const d26CatName = id => { const L = S.cats || []; const out = []; let x = L.find(k => k.id === id); while (x) { out.unshift(x.name); x = x.parent ? L.find(k => k.id === x.parent) : null; } return out.join(' › '); };
AFTER.push(cur => {
  try {
    if (!S || !S.org || cur.tab !== 'class' || !UI.cls) return; const c = C(UI.cls); if (!c) return;
    const ph = [...document.querySelectorAll('#main .ph')].find(p => (p.querySelector('h1,h2') || {}).textContent === c.name) || document.querySelector('#main .ph:has([data-act=c2-paylink])');
    const phr = ph && ph.querySelector('.phr'); if (!phr || phr.querySelector('[data-act=d26-view]')) return;
    const cat = c.cat ? d26CatName(c.cat) : '';
    phr.insertAdjacentHTML('afterbegin', `<button class="btn sm ghost d26-cat" data-act="d26-cat" title="카테고리 바꾸기">${ic('folder', 14)} ${esc(cat || '카테고리 미지정')}</button><button class="btn sm ghost" data-act="d26-view" data-v="${esc(c.id)}">${ic('eye', 14)} ${esc(t('learner'))} 화면 보기</button><button class="btn sm ghost" data-act="d26-share" data-v="${esc(c.id)}">${ic('link', 14)} 공유하기</button>`);
    const tw = document.querySelector('#main .c2lt, #main .tw'); if (tw && (UI.clsT || 'learners') === 'learners' && !document.querySelector('.d26-agg')) tw.insertAdjacentHTML('afterend', `<p class="mini d26-agg">수료율 집계 일시: ${esc(new Date().toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }))} · 진도는 ${esc(tj('learner', '이'))} 학습할 때마다 바로 반영됩니다.</p>`);
  } catch (e) { console.error(e); }
});
ACT['d26-view'] = el => { const c = C(el.dataset.v); if (!c) return; window.open(d26ClsURL(c), '_blank', 'noopener'); };
ACT['d26-share'] = el => { const c = C(el.dataset.v); if (!c) return; const u = d26ClsURL(c);
  if (typeof c2Copy === 'function') c2Copy(u, `「${c.name}」 주소를 복사했습니다. 메시지 · 카카오톡 · 홈페이지에 붙여 넣으세요.`); else { try { navigator.clipboard.writeText(u); } catch (e) { } toast('주소를 복사했습니다.', 'ok'); } };
ACT['d26-cat'] = () => { UI.clsT = 'set'; render(); setTimeout(() => { const s = document.querySelector('#main select[name=cat], #main [data-sec=info] select, #main select#c2Cat'); s && s.focus(); }, 60); };
COVER.push(['[v26] DDS 디자인 시스템 적용 · 클래스 상세 수강생 화면 보기 · 공유하기 · 카테고리 · 수료율 집계 일시', 'class', '']);
/* ── 클래스 목록: 카드 보기(피그마 '클래스 관리' 기본 보기) · 목록 보기 전환 ── */
{ const base = c2ListView; c2ListView = () => { let h = base(); try {
  const tog = `<span class="d26-view" role="group" aria-label="보기 방식"><button type="button" class="${UI.clsView === 'list' ? '' : 'on'}" data-act="d26-clsview" data-v="grid" aria-label="카드로 보기" title="카드로 보기">${ic('grid', 16)}</button><button type="button" class="${UI.clsView === 'list' ? 'on' : ''}" data-act="d26-clsview" data-v="list" aria-label="목록으로 보기" title="목록으로 보기">${ic('menu', 16)}</button></span>`;
  h = h.replace(/(<div class="bar2 c2lbar">[\s\S]*?)(<\/div>)/, `$1${tog}$2`);
  if (UI.clsView === 'list') return h;
  const f = UI.clsF || 'all', cat = UI.clsCat || '', q = (UI.clsQ || '').toLowerCase(); const tch = S.me.role === 'teacher' && typeof tMe === 'function' && tMe() ? tMe().classes : null;
  const list = S.classes.filter(c => (f === 'all' || c.kind === f) && (!cat || (cat === '_none' ? !c.cat : c2CatIds(cat).includes(c.cat))) && (!q || (c.name + ' ' + (c.teacher || '')).toLowerCase().includes(q)) && (!tch || tch.includes(c.id)));
  if (!list.length) return h;
  const kindL = c => c.kind === 'pack' ? `과정 ${(c.packOf || []).length || ''}`.trim() : c.sub || (KIND[c.kind] || '기간');
  const per = c => typeof c2Period === 'function' ? c2Period(c) : `${c.start || ''} ~ ${c.end || ''}`;
  const card = c => `<article class="d26-cc"><div class="d26-th">${c.thumb ? `<img src="${esc(c.thumb)}" alt="">` : `<span class="d26-th0"><b>${esc(c.name)}</b></span>`}<label class="d26-ck"><input type="checkbox" class="c2ck" value="${c.id}" aria-label="${esc(c.name)} 선택"></label>${c.recruit && c.recruit.on ? '<span class="d26-rib">수강<br>신청</span>' : ''}<span class="d26-kind">${esc(kindL(c))}</span></div>
    <div class="d26-cb"><div class="d26-tags">${tag(c.open === '비공개' ? '비공개' : '공개', c.open === '비공개' ? '' : 'g')}${c.sale ? tag(typeof c2SaleLabel === 'function' ? c2SaleLabel(c) : c.sale, c.sale === '판매중' ? 'g' : c.sale === '판매 종료' ? 'r' : 'y') : ''}${c.status ? tag(c.status, c.status === '운영중' ? 'b' : '') : ''}${c.legal ? tag('법정', 'r') : ''}</div>
      <div class="d26-ttl"><a href="#" data-act="cls-open" data-v="${c.id}">${esc(c.name)}</a><details class="uxmore uxdots d26-more"><summary aria-label="더 보기">${ic('dots', 16)}</summary><div class="uxpop" role="menu"><button data-act="cls-open" data-v="${c.id}">수정</button><button data-act="cls-copy" data-v="${c.id}">복사</button><button data-act="d26-share" data-v="${c.id}">공유</button>${c.price ? `<button data-act="c2-paylink" data-v="${c.id}">결제 링크 복사</button>` : ''}</div></details></div>
      <dl><dt>수강 신청</dt><dd>${c.recruit && c.recruit.on ? `${esc(c.recruit.from || '상시')} ~ ${esc(c.recruit.to || '상시')}` : '상시'} · ${c.learners.length}${c.recruit && c.recruit.cap ? '/' + c.recruit.cap : ''}명</dd><dt>수강 기간</dt><dd>${esc(per(c))}</dd></dl>
      <div class="d26-pri">${c2PriceHtml(c)}</div></div></article>`;
  h = h.replace(/<div class="tw"><table>[\s\S]*?<\/table><\/div>/, `<div class="d26-cg">${list.map(card).join('')}</div>`);
} catch (e) { console.error(e); } return h; }; }
ACT['d26-clsview'] = el => { UI.clsView = el.dataset.v; render(); };
ACT['d26-share'] = ACT['d26-share']; /* 카드 메뉴의 공유는 상세와 같은 동작 */
/* ── 매출: 월 이동 줄 + 월 매출액 · 월 환불 금액 · 전월 대비(피그마 '매출 관리') ── */
function d26Month(ym) { const P = (S.pays || []); const inM = (p, m) => String(p.at || '').startsWith(m);
  const prev = (() => { const d = new Date(ym + '-01'); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const sale = m => P.filter(p => inM(p, m) && /완료|환불/.test(p.status || '')).reduce((a, p) => a + (+p.amount || 0), 0);
  const ref = m => P.filter(p => p.refund && p.refund.state === '승인' && String(p.refund.at || '').startsWith(m)).reduce((a, p) => a + (+p.refund.amount || 0), 0);
  const s = sale(ym), r = ref(ym), sp = sale(prev) - ref(prev), net = s - r; return { s, r, diff: net - sp, cnt: P.filter(p => inM(p, ym)).length }; }
AFTER.push(cur => { try {
  if (!S || !S.org || cur.tab !== 'sales' || document.querySelector('.d26-mon')) return; const k = document.querySelector('#main section.grid.g3'); if (!k) return;
  const ym = UI.d26ym || today().slice(0, 7); const [y, m] = ym.split('-'); const M = d26Month(ym);
  k.insertAdjacentHTML('beforebegin', `<section class="card d26-mon"><div class="d26-monh"><b>${ic('chart', 16)} ${y}년 ${+m}월</b><button type="button" class="btn sm ghost" data-act="d26-ym" data-v="-1" aria-label="이전 달">‹</button><button type="button" class="btn sm ghost" data-act="d26-ym" data-v="1" aria-label="다음 달">›</button><button type="button" class="btn sm" data-act="d26-ym" data-v="0">이번 달</button><span class="sp"></span><small>결제 ${M.cnt}건</small></div>
    <div class="d26-mk"><div><small>월 매출액</small><b>${won(M.s)}</b></div><div><small>월 환불 금액</small><b>${won(M.r)}</b></div><div><small>전월 대비(순매출)</small><b class="${M.diff >= 0 ? 'up' : 'dn'}">${M.diff >= 0 ? '▲' : '▼'} ${won(Math.abs(M.diff))}</b></div></div></section>`);
} catch (e) { console.error(e); } });
ACT['d26-ym'] = el => { const v = +el.dataset.v; if (!v) UI.d26ym = today().slice(0, 7); else { const d = new Date((UI.d26ym || today().slice(0, 7)) + '-01'); d.setMonth(d.getMonth() + v); UI.d26ym = d.toISOString().slice(0, 7); } render(); };
/* v26.2 메시지 내용 글자 수 */
document.addEventListener('input', e => { if (e.target.id === 'msgB') { const c = document.getElementById('msgBc'); if (c) c.textContent = e.target.value.length + '/2000'; } });
/* v26.2 디지털 배지 머리(피그마 Studio › 디지털 배지 관리): [+ 배지 생성하기] · [배지 발급하기] */
ACT['bd26-go'] = el => { UI.bdT = el.dataset.v; render(); };
AFTER.push(() => { try { if (!CUR || CUR.tab !== 'badge') return; const phr = document.querySelector('#main .ph .phr'); if (!phr || phr.querySelector('[data-act=bd26-go]')) return;
  phr.insertAdjacentHTML('beforeend', `<button type="button" class="btn" data-act="bd26-go" data-v="set">${ic('plus', 15)} 배지 생성하기</button><button type="button" class="btn pri" data-act="bd26-go" data-v="manual">${ic('award', 15)} 배지 발급하기</button>`); } catch (e) { console.error(e); } });
/* v26.2 상담 머리(피그마 Studio › 상담 목록): [채널톡 이동] */
AFTER.push(() => { try { if (!CUR || CUR.tab !== 'consult') return; const phr = document.querySelector('#main .ph .phr'); if (!phr || phr.querySelector('.cs26ch')) return; const on = S.settings && S.settings.consultKeys;
  const ref = phr.querySelector('[data-act*="cs-start"], .btn.dark, .btn.pri'); const h = `<a class="btn cs26ch ${on ? '' : 'off'}" href="https://desk.channel.io/" target="_blank" rel="noopener" ${on ? '' : 'aria-disabled="true" title="설정 탭에서 채널톡을 연동하면 열 수 있습니다"'}>${ic('chat', 15)} 채널톡 이동</a>`;
  ref ? ref.insertAdjacentHTML('beforebegin', h) : phr.insertAdjacentHTML('beforeend', h); } catch (e) { console.error(e); } });
document.addEventListener('click', e => { const a = e.target.closest('a.cs26ch.off'); if (a) { e.preventDefault(); if (typeof toast === 'function') toast('설정 탭에서 채널톡을 먼저 연동하세요.', 'warn'); } }, true);
/* v26.2 교재/교구 관리 규칙(피그마 Studio › 교재/교구 › 운영 정책): 삭제 · 공개/비공개 */
const bk26Active = b => { const d = (b.dl && +b.dl.days) || 30; const t0 = today(); return (b.grants || []).filter(g => !g.off && (typeof addDays === 'function' ? addDays(g.at, d) : g.at) >= t0); };
ACT['bk26-del'] = el => { const b = S.books.find(x => x.id === el.dataset.v); if (!b) return; const eb = b.kind === '전자책';
  if (eb && bk26Active(b).length) { modal('삭제할 수 없습니다', `<p>아직 다운로드 기간이 남은 ${esc(tj('learner', '이'))} 있습니다. 모든 ${esc(t('learner'))}의 다운로드 기간 마감 후 삭제할 수 있습니다.</p>`, [{ id: 'ok', label: '확인', kind: 'pri' }]); return; }
  if (!eb && ((b.grants || []).some(g => !g.off) || (b.ship || []).length)) { modal('삭제할 수 없습니다', `<p>이 교재를 결제/신청한 ${esc(tj('learner', '이'))} 있어 삭제가 불가능합니다. 비공개로 전환하면 새로 판매되지 않습니다.</p>`, [{ id: 'ok', label: '확인', kind: 'pri' }]); return; }
  modal('교재 삭제', `<p>「${esc(b.name)}」을(를) 삭제합니다. 삭제하면 되돌릴 수 없습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { S.books = S.books.filter(x => x !== b); logAudit('교재 삭제 — ' + b.name); save(); render(); toast('교재를 삭제했습니다.', 'ok'); } }]); };
ACT['bk26-open'] = el => { const b = S.books.find(x => x.id === el.dataset.v); if (!b) return; const eb = b.kind === '전자책';
  if (b.open === '비공개') { b.open = '공개'; logAudit('교재 공개 — ' + b.name); save(); render(); toast('교재 상태를 공개로 전환하였습니다.', 'ok'); return; }
  b.open = '비공개'; logAudit('교재 비공개 — ' + b.name); save(); render(); toast(eb ? '교재 상태를 비공개로 전환하였습니다. 다운로드 기간이 남아 있는 수강생은 계속해서 교재를 다운받을 수 있습니다.' : '교재 상태를 비공개로 전환하였습니다. 전달 완료되지 않은 수강생들은 교재 내용을 확인할 수 있습니다.', 'ok'); };
AFTER.push(() => { try { if (!CUR || CUR.tab !== 'book' || !Array.isArray(S.books)) return; document.querySelectorAll('#main [data-act="sl2-bked"]').forEach(btn => { if (btn.parentElement.querySelector('[data-act="bk26-del"]')) return; const b = S.books.find(x => x.id === btn.dataset.v); if (!b) return;
  btn.insertAdjacentHTML('afterend', `<button class="btn sm ghost" data-act="bk26-open" data-v="${esc(b.id)}">${b.open === '비공개' ? '공개로 전환' : '비공개'}</button><button class="btn sm redl" data-act="bk26-del" data-v="${esc(b.id)}">삭제</button>`); }); } catch (e) { console.error(e); } });
/* v26.4 플랜 · 결제(피그마 Studio › 요금제 › 결제 내역 및 요금제 해지): [요금제 안내 | 결제 내역] · 내 요금제 · 다음 결제일 · 해지 예약/취소 · 결제 상세 내역 */
{ const PLN = { standard: ['스탠다드', 0], premium: ['프리미엄', 300000], enterprise: ['엔터프라이즈', null] };
  const ymd = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const bills = () => { const p = PLN[S.org.plan] || PLN.premium; if (!p[1]) return []; const L = []; const d0 = new Date(); const k = d0.getDate() >= 27 ? 0 : 1; for (let i = 0; i < 5; i++) { const s0 = new Date(d0.getFullYear(), d0.getMonth() - i - k, 27), e = new Date(s0.getFullYear(), s0.getMonth() + 1, 26); L.push({ at: ymd(s0), plan: p[0], from: ymd(s0), to: ymd(e), no: 'DS' + ymd(s0).replace(/-/g, '') + String(i + 1).padStart(2, '0'), how: '신용카드', amt: p[1] }); } return L; };
  const next = () => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth() + (d.getDate() >= 27 ? 1 : 0), 27)); };
  const base = VIEWS.plan; VIEWS.plan = () => { const tb = UI.plT || 'info'; const T = tabs('plT', [['info', '요금제 안내'], ['bill', '결제 내역']], tb); if (tb === 'info') { const h = base(); const i = h.indexOf('<div class="grid g3">'); return i < 0 ? T + h : h.slice(0, i) + T + h.slice(i); }
    const p = PLN[S.org.plan] || PLN.premium; const cx = S.org.planCancel; const own = S.me && S.me.role === 'owner'; const B = bills();
    return head('플랜 · 결제', `결제 내역을 보고 요금제를 해지합니다. ${guideRef('features/plan.md')}`) + T +
      `<div class="card pl26"><div class="pl26c"><small>내 요금제</small><div><b>${esc(p[0])} 플랜</b> <span class="mini">${p[1] == null ? '별도 협의' : p[1] ? `월 ${num(p[1])}원` : '무료'}</span> ${cx ? tag(`${esc(cx)} 해지 예정`, 'y') : ''}</div></div><div class="pl26c"><small>다음 결제일</small><b>${p[1] && !cx ? esc(next()) : '—'}</b></div>
        <div class="pl26a">${own ? (cx ? `<button class="btn sm" data-act="pl26-undo">해지 취소</button>` : p[1] ? `<button class="btn sm redl" data-act="pl26-cancel">요금제 해지하기</button>` : '') : '<small class="mini">요금제 해지는 정운영자만 할 수 있습니다.</small>'}</div></div>
      <div class="card"><div class="ch"><b>결제 상세 내역</b><small>${B.length}건</small></div>${table(['결제일', '요금제명', '서비스 기간', '결제번호', '결제방식', '결제금액'], B.map(x => [esc(x.at), esc(x.plan), `${esc(x.from)} ~ ${esc(x.to)}`, `<code>${esc(x.no)}</code>`, esc(x.how), num(x.amt) + '원']), p[1] == null ? '엔터프라이즈 요금제는 계약서 · 세금계산서로 청구됩니다.' : '결제 내역이 없습니다.')}<p class="mini">${ic('info', 13)} 요금제 환불은 디디쌤 고객센터(채널톡)로 문의해 주세요. 데모 화면의 결제 내역은 예시입니다.</p></div>`; };
  ACT['pl26-cancel'] = () => { const nx = next(); modal('요금제 해지', `<p>요금제를 해지하면 다음 결제일(${esc(nx)})부터 결제되지 않고, 그날까지는 지금 기능을 그대로 씁니다. 이후에는 스탠다드(무료) 기능만 쓸 수 있습니다.</p><p class="mini">해지 예정 기간에는 언제든 '해지 취소'로 되돌릴 수 있습니다.</p>`, [{ id: 'c', label: '닫기' }, { id: 'ok', label: '해지하기', kind: 'red', run: () => { S.org.planCancel = nx; logAudit('요금제 해지 예약 — ' + nx); save(); render(); toast(`${nx}에 요금제가 해지됩니다.`, 'ok'); } }]); };
  ACT['pl26-undo'] = () => { delete S.org.planCancel; logAudit('요금제 해지 취소'); save(); render(); toast('요금제 해지를 취소했습니다.', 'ok'); }; }
/* v26.4 커뮤니티 관리 머리(피그마 Studio › 커뮤니티 관리): [커뮤니티로 이동] — 학습자 사이트 커뮤니티 새 창 */
AFTER.push(() => { try { if (!CUR || CUR.tab !== 'community') return; const phr = document.querySelector('#main .ph .phr'); if (!phr || phr.querySelector('.cm26go')) return;
  const u = (typeof mbLURL === 'function' ? mbLURL() : 'learner.html') + '#comm'; phr.insertAdjacentHTML('beforeend', `<a class="btn pri cm26go" href="${esc(u)}" target="_blank" rel="noopener">${ic('arrow', 15)} 커뮤니티로 이동</a>`); } catch (e) { console.error(e); } });
/* v43 E2 — 설정 하위 화면 첫 줄 브리핑(L43). 설정 루트 · 메뉴 구성(D2 등록)은 그대로 두고 UI.settings 하위만 덧붙인다.
   l43.js가 뒤에 로드되므로 DOMContentLoaded에서 감싼다. 숫자만 읽고 저장 값 · 렌더는 바꾸지 않는다. */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PLAN = { standard: '스탠다드', premium: '프리미엄', enterprise: '엔터프라이즈' };
  const SUB = {
    rules: ['학습 규칙 · AI 튜터', () => { const p = (S.settings || {}).progress || {}, tu = (S.settings || {}).tutor || {}; const q = (S.tutorUsage || []).reduce((a, u) => a + (+u.n || 0), 0);
      return { title: `완료 기준 시청률 <em>${+p.watchThr || 0}%</em>, AI 튜터는 ${tu.enabled ? '사용 중입니다' : '꺼져 있습니다'}`, sub: '대화 내용은 저장하지 않고 질문 횟수만 집계합니다. 과제를 대신 써 주지 않도록 도움 범위를 정하세요.', stats: [[q + '회', '최근 7일 질문'], [(+tu.daily || 0) + '회', '1인 하루 한도'], [(+p.resubmit || 0) + '회', '과제 재제출']] }; }],
    plan: ['요금제 · 결제', () => ({ title: `지금 요금제는 <em>${E(PLAN[S.org.plan] || S.org.plan || '체험')}</em>입니다`, sub: '요금제 변경은 정운영자만 할 수 있습니다. 결제 내역 탭에서 영수증을 받습니다.' })],
    integr: ['연동', () => ({ title: 'Slack · Google · AI(MCP) 같은 <em>외부 서비스</em>를 연결합니다', sub: 'API 키는 서버에만 저장되고 화면에는 앞 몇 자리만 보입니다. 쓰지 않는 키는 바로 폐기하세요.' })],
    service: ['서비스 설정', () => { const st = S.settings || {}; return { title: `회원 가입은 <em>${E(st.join || '자동 수락')}</em> 방식입니다`, sub: '홈페이지 공개 범위 · 가입 질문 · 재생 속도를 여기서 정합니다. 바꾼 값은 바로 저장됩니다.' }; }],
    terms: ['약관', () => { const H = (S.settings || {}).termsHist || []; return { title: H.length ? `약관 개정 이력 <em>${H.length}건</em>을 보관하고 있습니다` : '디디쌤 기본 약관을 <em>우리 기관</em>에 맞게 고쳐 쓰세요', sub: '약관을 바꾸면 시행일 7일 전(회원에게 불리한 변경은 30일 전)까지 공지해야 합니다.' }; }],
    popup: ['팝업', () => { const P = (S.settings || {}).popups || []; const td = today(); const live = P.filter(p => p.on !== false && (!p.s || p.s <= td) && (!p.e || p.e >= td)).length;
      return P.length ? { title: `첫 화면 팝업 <em>${live}개</em>가 지금 보이고 있습니다`, sub: `등록 ${P.length}개 · 최대 4개까지 띄울 수 있습니다. 기간이 끝난 팝업은 자동으로 숨겨집니다.` } : { title: '첫 화면에 띄울 <em>팝업</em>이 없습니다', sub: '이벤트 · 약관 변경처럼 꼭 알릴 내용을 팝업으로 올리세요(최대 4개).' }; }],
    lang: ['언어 · 용어', () => ({ title: '화면 언어와 용어를 <em>우리 기관 말</em>로 바꿉니다', sub: '예를 들어 「과정」을 「강좌」로 바꾸면 운영자 · 학습자 화면 모두에 같이 반영됩니다.' })],
    data: ['데이터', () => ({ title: '기관 데이터를 <em>내보내거나 초기화</em>합니다', sub: '초기화는 되돌릴 수 없습니다. 먼저 내보내기로 백업하세요.' })],
    room: ['데이터룸 · 배포', () => ({ title: '이 기관의 데이터는 <em>전용 데이터룸</em>에 분리해 저장합니다', sub: '배포 모델(공유 SaaS · 전용 클라우드 · 고객 클라우드 · 설치형)에 따라 저장 위치가 달라집니다.' })]
  };
  const reg = () => {
    if (!window.L43) return; const base = L43.REG.settings || {};
    L43.reg('settings', Object.assign({}, base, { brief: m => { const k = UI.settings; if (!k || !SUB[k]) return base.brief ? base.brief(m) : null; return Object.assign({ eye: '설정 · ' + SUB[k][0] }, SUB[k][1]()); } }));
    if (!document.querySelector('style[data-set43]')) { const st = document.createElement('style'); st.dataset.set43 = '1'; st.textContent = `
#main.l43[data-l43=settings] .btn,#main.l43[data-l43=settings] select,#main.l43[data-l43=settings] input:not([type=checkbox]):not([type=radio]):not([type=range]){min-height:44px}
#main.l43[data-l43=settings] .btn.sm{display:inline-flex;align-items:center;padding-top:0;padding-bottom:0}
#main.l43[data-l43=settings] .link{min-height:44px;min-width:44px}
#main.l43[data-l43=settings] .card.plan.on{box-shadow:0 0 0 2px var(--gr600),var(--sh1)}
#main.l43[data-l43=settings] .card.plan strong{font-size:24px;font-weight:800;color:var(--g900)}
#main.l43[data-l43=settings] .swrow small,#main.l43[data-l43=settings] .rng2 small{font-size:12px;color:var(--t-sub)}
#main.l43[data-l43=settings] .rng2 em{font-style:normal;font-weight:800;color:var(--gr800);font-variant-numeric:tabular-nums}
#main.l43[data-l43=settings] .tr26n{border-radius:16px;background:var(--co50);color:var(--g900);border:0}
#main.l43[data-l43=settings] .tr26n b{color:var(--co700)}
#main.l43[data-l43=settings] .spark small{font-size:12px;color:var(--t-sub)}
#main.l43[data-l43=settings] .spark i{background:var(--c-data)}
#main.l43[data-l43=settings] .sl-sw{box-sizing:border-box;height:44px;padding:7px 0;background-clip:content-box}
#main.l43[data-l43=settings] .sl-sw i{top:10px}
#main.l43[data-l43=settings] .sx-lg{background:var(--surface);border-color:var(--hair)}
#main.l43[data-l43=settings] .sx-lg.on{border-color:var(--gr600);background:var(--gr50)}
#main.l43[data-l43=settings] .sx-lg.on em{color:var(--gr800,#066B2A)}
#main.l43[data-l43=settings] .seg2 button,#main.l43[data-l43=settings] .subtabs button{min-height:44px}`; document.head.appendChild(st); }
    try { L43.run(); } catch (e) { }
  };
  if (window.L43) reg(); else document.addEventListener('DOMContentLoaded', reg);
})();
