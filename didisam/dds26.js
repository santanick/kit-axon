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
    type: ['기관 정보', () => ({ kind: 'list', title: `<em>${E(S.org.name)}</em>의 기본 정보와 기관 유형입니다`, sub: '유형을 바꾸면 추천 메뉴 · 순서 · 용어가 그 유형에 맞게 바뀝니다. 데이터는 그대로 유지됩니다.', todo: [[`기관 유형 ${E((TYPES[S.org.type] || {}).name || '')}`, '메뉴 · 용어 프리셋 기준', 'ok'], [`홈페이지 주소 ${E(S.org.domain || '')}`, /^org-/.test(S.org.domain || '') ? '영문 도메인으로 바꾸면 검색 노출이 좋아집니다' : '학습자 사이트 주소', /^org-/.test(S.org.domain || '') ? 'warn' : 'ok'], [`개설일 ${E(S.org.created || '')}`, '데모 데이터는 이 브라우저에만 저장됩니다', '']] })],
    data: ['데이터', () => ({ title: '기관 데이터를 <em>내보내거나 초기화</em>합니다', sub: '초기화는 되돌릴 수 없습니다. 먼저 내보내기로 백업하세요.' })],
    menus: ['메뉴 구성', () => { let on = 0, all = 0; try { const A = Object.values(S.nav.tabs).flat().filter(x => MENU[x.id]); all = A.length; on = A.filter(x => x.on).length; } catch (e) { } return { kind: 'kpi', title: `메뉴 <em>${on}개</em>를 켜서 쓰고 있습니다`, sub: '쓰지 않는 메뉴를 끄면 운영자 · 학습자 화면이 그만큼 단순해집니다. 끈 메뉴의 데이터는 지워지지 않습니다.', stats: [[on + '개', '켜진 메뉴'], [Math.max(0, all - on) + '개', '꺼진 메뉴'], [((S.admins || []).length) + '명', '함께 쓰는 운영자']] }; }],
    room: ['데이터룸 · 배포', () => ({ title: '이 기관의 데이터는 <em>전용 데이터룸</em>에 분리해 저장합니다', sub: '배포 모델(공유 SaaS · 전용 클라우드 · 고객 클라우드 · 설치형)에 따라 저장 위치가 달라집니다.' })]
  };
  /* v43 D-D — 설정 하위 화면(073~084): 요약 카드에 숫자 · 처리 행을 더하고, 루트와 같은 「설정 목차 + AI SAM 제안」 보조 열을 모든 하위 화면에 붙인다.
     펼친 카드는 목록 맨 앞 · 전체 폭으로 올려(CSS order) 요약 카드 바로 아래에서 본다. DOM 순서 · data-act는 그대로 둔다. */
  const st0 = () => S.settings || {};
  const MORE = {
    rules: () => { const p = st0().progress || {}; return { kind: 'kpi', ring: [+p.watchThr || 0, '완료 기준'], todo: [[`순차 학습 ${p.seq ? '켜짐' : '꺼짐'}`, '앞 레슨을 끝내야 다음 레슨이 열립니다', p.seq ? 'ok' : ''], [`실제 재생 구간만 인정 ${p.realOnly ? '켜짐' : '꺼짐'}`, '건너뛰기 · 2배속 초과 구간은 제외합니다', p.realOnly ? 'ok' : 'warn']] }; },
    plan: () => { const N = (S.members || []).length; const cap = { standard: 50, premium: 500 }[S.org.plan]; const d = new Date(); const nx = new Date(d.getFullYear(), d.getMonth() + 1, 1); const ren = `${nx.getMonth() + 1}월 ${nx.getDate()}일`; /* v43 R7: 요금제와 관계있는 숫자(사용량 · 갱신일 · 요금)만(J2 076) */
      return { kind: 'kpi', ring: cap ? [Math.round(N / cap * 100), `학습자 ${N} / ${cap}명`, N / cap > .8 ? 'warn' : ''] : null, stats: [[ren, '다음 갱신일'], [({ standard: '무료', premium: '월 30만원', enterprise: '협의' })[S.org.plan] || '체험', '이번 달 요금'], [cap ? (cap - N) + '명' : '제한 없음', '추가 가능 학습자']] }; },
    integr: () => { const K = (S.apikeys || []); const live = K.filter(k => !k.revoked_at).length; const calls = K.reduce((a, k) => a + (+k.calls || 0), 0); return { kind: 'list', todo: [[`MCP 키 ${live}개 사용 중`, `최근 30일 호출 ${calls.toLocaleString()}회`, live ? 'ok' : ''], [`결제 연결 ${st0().pg && st0().pg !== 'none' ? '사용 중' : '미연결'}`, '수강료 · 교재 결제를 받습니다', st0().pg && st0().pg !== 'none' ? 'ok' : 'warn'], [`카카오 채널 ${st0().kakao ? '연결됨' : '미연결'}`, '알림톡 · 상담 채널', st0().kakao ? 'ok' : '']] }; },
    service: () => { const q = (st0().extraQ || []); return { kind: 'list', todo: [[`홈페이지 ${st0().siteOpen === 'private' ? '로그인 사용자만' : '누구나'} 볼 수 있음`, '공개 범위', 'ok'], [`가입 질문 ${q.length}개`, q.length ? q.join(' · ') : '이름 · 연락처만 받습니다', ''], [`재생 속도 ${st0().speedMin || 0.5}배 ~ ${st0().speedMax || 2}배`, '학습자 플레이어에 적용', 'ok']] }; },
    terms: () => { const T = st0().terms || {}; const H = st0().termsHist || []; const nx = H.map(h => h.at || h.eff || '').filter(Boolean).sort().pop(); return { kind: 'list', todo: [[`이용약관 ${T.tos ? '등록됨' : '미등록'}`, T.tos ? '홈페이지 아래에 노출됩니다' : '기본 문안으로 바로 등록할 수 있습니다', T.tos ? 'ok' : 'warn'], [`개인정보 처리방침 ${T.privacy ? '등록됨' : '미등록'}`, '수집 항목 · 보관 기간을 적습니다', T.privacy ? 'ok' : 'warn'], [H.length ? `개정 이력 ${H.length}건 보관` : '개정 이력 없음', nx ? `가장 최근 시행 ${String(nx).slice(0, 10)} · 시행 7일 전 공지` : '새 버전으로 저장하면 이력이 남습니다', H.length ? 'ok' : '']] }; }, /* v43 R7: 처리 묶음 3건(J2 079) */
    popup: () => { const P = st0().popups || []; const td = today(); const live = P.filter(p => p.on !== false && (!p.s || p.s <= td) && (!p.e || p.e >= td)).length; const soon = P.filter(p => p.on !== false && p.s && p.s > td).length; return { ...(P.length && !live && soon ? { title: `노출 예약된 팝업 <em>${soon}개</em>가 시작일을 기다리고 있습니다`, sub: `등록 ${P.length}개 · 최대 4개까지 띄울 수 있습니다. 시작일이 되면 학습자 사이트 첫 화면에 순서대로 뜹니다.` } : {}), kind: 'list', todo: P.length ? P.slice(0, 3).map(p => [p.t || '(제목 없음)', `${p.s || ''} ~ ${p.e || ''}`, p.on === false ? '' : (p.s && p.s > td ? '' : 'ok')]) : null }; },
    lang: () => ({ kind: 'list', todo: [['화면 언어 한국어', '운영자 · 학습자 화면 공통', 'ok'], ['학습자 사이트 번역 4개 언어', '영어 · 일본어 · 중국어 · 베트남어', 'ok'], ['기관 용어 바꾸기', '과정 → 강좌처럼 우리 기관 말로', '']] }),
    data: () => ({ kind: 'list', todo: [['마지막 내보내기 11월 14일', 'JSON · 학습자 · 결제 · 진도 전체', 'ok'], ['자동 백업 매일 03:00', '최근 7일 보관', 'ok'], ['초기화는 정운영자만', '되돌릴 수 없으니 먼저 내보내세요', 'warn']] }),
    room: () => ({ kind: 'kpi', ring: [100, '분리 점검 통과'], stats: [['공유 SaaS', '배포 모델'], ['서울 리전', '저장 위치'], ['90일', '접근 기록 보관']] }) /* v43 R7: 「정상」 칩 3줄 반복 → 요약 링 + 숫자(J2 084) */
  };
  const TIPS = {
    menus: ['처음 한 달은 기본 메뉴만 켜 두고, 자주 찾는 기능부터 하나씩 켜세요', '「순서 바꾸기」로 자주 쓰는 메뉴를 위로 올리면 클릭이 줄어듭니다', '교수자에게는 과정 · 평가 메뉴만 보이도록 권한에서 나눌 수 있습니다'],
    rules: ['완료 기준 시청률은 80%가 가장 많이 쓰는 값입니다', '직업훈련 과정은 순차 학습과 실제 재생 구간 인정을 함께 켜야 인정됩니다', 'AI 튜터 도움 범위는 「힌트만」으로 두면 과제 대필을 막을 수 있습니다'],
    plan: ['학습자가 요금제 한도의 80%를 넘으면 미리 알려 드립니다', '연간 결제로 바꾸면 2개월 요금이 줄어듭니다', '영수증은 결제 내역에서 바로 받을 수 있습니다'],
    integr: ['쓰지 않는 MCP 키는 폐기하세요 — 90일 넘게 호출이 없는 키가 있습니다', 'Slack을 연결하면 미납 · 질문 알림을 채널로 받습니다', '키 범위는 읽기 전용부터 시작하세요'],
    service: ['가입 질문은 3개 이하일 때 가입 완료율이 가장 높습니다', '대학은 학번 · 학과만 받습니다(개인정보 최소 수집)', '마케팅 수신 동의는 선택 항목으로 두세요'],
    terms: ['환불 조항은 학원법 · 평생교육법 기준 초안을 AI가 만들어 드립니다', '회원에게 불리한 변경은 시행 30일 전에 공지하세요', '개정 후에는 첫 화면 팝업으로 알리면 확인율이 높습니다'],
    popup: ['팝업은 2개 이하일 때 닫기 전 클릭이 가장 많습니다', '약관 개정 팝업은 시행일까지 노출하세요', '모바일에서는 첫 팝업만 보이니 중요한 것을 위로 올리세요'],
    lang: ['외국인 학습자가 있으면 학습자 사이트에 영어를 켜세요', '용어를 바꾸면 AI SAM 답변에도 같은 말이 쓰입니다', '번역은 게시 전 미리보기로 확인하세요'],
    data: ['초기화 전에 내보내기로 백업을 먼저 받으세요', '내보낸 파일에는 개인정보가 들어 있으니 암호를 걸어 보관하세요', '저장 공간이 80%를 넘으면 오래된 영상부터 정리하세요'],
    room: ['공공 · 대학은 전용 클라우드 또는 설치형을 많이 고릅니다', '배포 모델을 바꾸면 이전 작업은 디디쌤 지원팀이 함께 합니다', '접근 기록은 개인정보 점검 때 그대로 제출할 수 있습니다']
  };
  const subKey = () => !UI.sxOpen ? '' : UI.sxSub === 'onoff' || UI.settings === 'menu' ? 'menus' : UI.settings; /* v43 R3: 루트(아무것도 열지 않음)는 루트 머리 */
  window.SX_TIPS = TIPS;
  const subEnhance = main => { const k = subKey(); const pg = main.querySelector('.sx-page'); if (!pg || pg.closest('.q1-2col') || pg.classList.contains('sx3')) return; /* v43 R3: 목차 · 보조 열을 화면이 직접 그린다 */ pg.classList.add('q1-wide', 'dd-sub');
    const open = pg.querySelector('.sx-card.open'); const toc = [...pg.querySelectorAll('.sx-card[id]')].map(c => [((c.querySelector('h3,h2,b') || {}).textContent || c.id).trim().slice(0, 18), c === open ? 'cur' : '', c.id]);
    const tips = TIPS[k] || ['바꾼 값은 바로 저장됩니다. 학습자 화면에서 미리보기로 확인하세요.'];
    L43.side(main, pg, L43.acard({ t: '설정 목차', items: toc }) + L43.acard({ ai: true, t: 'AI SAM 제안', p: tips.map(E).join('<br>') }));
    const a = main.querySelector('.q1-aside a[data-q1to="' + (open ? open.id : '') + '"]'); if (a) a.setAttribute('aria-current', 'true'); };
  const reg = () => {
    if (!window.L43) return; const base = L43.REG.settings || {};
    /* v43 R7 2차: 설정 머리 주 · 보조 버튼(J2 공통 결함 「머리 버튼 없음」) — 화면에 이미 있는 버튼을 대신 누르거나(go) 관련 화면으로 간다(tab) */
    const G = (a, v) => `[data-act="${a}"]` + (v != null ? `[data-v="${v}"]` : '');
    const SACT = { menus: [{ label: '메뉴 순서 바꾸기', go: G('sx-sub', 'menu|menu') }, { label: '켜진 메뉴만 보기', kind: 'sec', go: G('sl-chip', 'on') }],
      rules: [{ label: `${(typeof t === 'function' ? t('learner') : '학습자')} 진도 보기`, tab: 'members' }, { label: '학습자 화면에서 확인', kind: 'sec', tab: 'site' }],
      plan: [{ label: '결제 내역 · 영수증', go: G('tab', 'bill') }, { label: '매출 · 결제 열기', kind: 'sec', tab: 'sales' }],
      integr: [{ label: 'Slack 연결하기', go: G('sl-cn', 'slack') }, { label: 'AI 연결(MCP) 키 관리', kind: 'sec', go: G('sx-sec', 'integr|0') }],
      service: [{ label: '가입 질문 추가', go: G('mem-q') }, { label: '운영자 · 권한 관리', kind: 'sec', tab: 'admins' }],
      terms: [{ label: '새 버전으로 저장', go: G('tr26-save') }, { label: 'AI 유형별 초안', kind: 'sec', go: G('ai-terms') }],
      popup: [{ label: '+ 팝업 추가', go: G('popup-new') }, { label: '팝업 미리보기', kind: 'sec', go: G('pp26-pv', 'all') }],
      lang: [{ label: '언어 설정 열기', go: G('sx-sub', 'lang|lang') }, { label: '학습자 사이트에서 확인', kind: 'sec', tab: 'site' }],
      data: [{ label: '전체 데이터 내보내기', go: G('data-export') }, { label: '오래된 기록 정리', kind: 'sec', go: G('st-compact') }],
      room: [{ label: '설치 구성 파일 받기', go: G('dr-yaml') }, { label: '데이터룸 내보내기', kind: 'sec', go: G('data-export') }] };
    const rootActs = () => { const st = S.settings || {}; const A = []; if (!(st.terms && st.terms.tos)) A.push({ label: '약관 기본 문안 등록', tab: 'terms' }); if (!st.pg || st.pg === 'none') A.push({ label: '결제 연결하기', go: G('sl-cn', 'toss') }); A.push({ label: '메뉴 켜고 끄기', tab: 'more' }); return A.slice(0, 2).map((a, i) => Object.assign(a, { kind: i ? 'sec' : 'pri' })); };
    L43.reg('settings', Object.assign({}, base, { brief: m => { const k = subKey(); if (!k || !SUB[k]) { const o0 = base.brief ? base.brief(m) : null; if (o0 && !o0.acts) o0.acts = rootActs(); return o0; } const o = Object.assign({ eye: '설정 · ' + SUB[k][0] }, SUB[k][1]()); const x = MORE[k] ? MORE[k]() : {}; Object.keys(x).forEach(j => { if (x[j] != null) o[j] = x[j]; }); if (!o.acts && SACT[k]) o.acts = SACT[k]; return o; },
      enhance: m => { const k = subKey(); if (!k || !SUB[k]) return base.enhance && base.enhance(m); try { subEnhance(m); } catch (e) { console.error(e); } } }));
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
#main.l43[data-l43=settings] .seg2 button,#main.l43[data-l43=settings] .subtabs button{min-height:44px}
#main.l43[data-l43=settings] .sx-page.dd-sub .sx-card.open{order:-1;grid-column:1/-1;background:var(--surface)!important;box-shadow:0 0 0 1.5px var(--gr600),0 1px 2px rgba(16,24,40,.05),0 16px 36px -18px rgba(5,61,30,.28)}
#main.l43[data-l43=settings] .sx-page.dd-sub .sx-card.open .sx-h{padding-bottom:14px;margin-bottom:6px;border-bottom:1px solid var(--hair)}
#main.l43[data-l43=settings] .sx-page.dd-sub .sx-card.open .sx-h h3{font-size:20px;font-weight:800}
#main.l43[data-l43=settings] .sx-page.dd-sub .sx-card.open .sx-q{display:none}
#main.l43[data-l43=settings] .sx-page.dd-sub .sx-card:not(.open){padding:14px 18px}
#main.l43[data-l43=settings] .sx-page.dd-sub .sx-card:not(.open) .sx-q{display:none}
#main.l43[data-l43=settings] .sx-page.dd-sub .sx-card:not(.open) .sx-h{margin:0}
#main.l43[data-l43=settings] .q1-ac li i.cur{background:var(--gr600);box-shadow:0 0 0 4px var(--gr100,#DDF5E3)}
#main.l43[data-l43=settings] .q1-ac li a[aria-current]{background:var(--gr50);color:var(--gr800);font-weight:800}
#main.l43[data-l43=settings] .sl-setx .card{border-radius:18px}
#main.l43[data-l43=settings] .sl-setx .swrow{min-height:56px;padding:8px 0;border-bottom:1px solid var(--hair)}
#main.l43[data-l43=settings] .sl-setx .rng2{min-height:56px}
#main.l43[data-l43=settings] .sl-setx .pp26l li{min-height:64px;border-radius:16px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--hair);padding:10px 14px;margin-bottom:8px}
#main.l43[data-l43=settings] .sl-setx .pp26l li b{font-size:15px;font-weight:700;color:var(--g900)}`; document.head.appendChild(st); }
    try { L43.run(); } catch (e) { }
  };
  if (window.L43) reg(); else document.addEventListener('DOMContentLoaded', reg);
})();
/* v43 D-D — 설정 하위 화면 시연 데이터(DIRECTION §6): 팝업 2건(노출 예약 — 게시한 학습자 사이트 첫 화면을 가리지 않도록 시작일이 미래) · 약관 개정 이력 2건 · MCP 키 3개.
   시연 경로(seed)에만 넣고, 빈 스튜디오(emptyOut)에서는 다시 비운다. 저장 구조는 mods.js · mcpui.js와 같다. */
{ const base = seed; seed = function (type) { const d = base.apply(this, arguments); try { const st = d.settings || {}; const td = today(), ad = n => addDays(td, n);
    if (Array.isArray(st.popups) && !st.popups.length) st.popups = [{ t: '겨울 특강 얼리버드 신청 안내', s: ad(4), e: ad(24), on: true, body: '12월 20일까지 신청하면 수강료 10%를 할인해 드립니다.' }, { t: '이용약관 개정 안내(12월 1일 시행)', s: ad(8), e: ad(15), on: true, body: '환불 기준 조항이 바뀝니다. 자세한 내용은 약관에서 확인하세요.' }];
    if (!Array.isArray(st.termsHist) || !st.termsHist.length) st.termsHist = [{ k: 'tos', at: ad(15), text: '' }, { k: 'tos', at: '2026-03-02', text: '' }, { k: 'privacy', at: '2026-03-02', text: '' }];
    /* v43 R3: 설정 보조 열 「변경 이력」 — 시연 경로에만 설정 변경 기록 10건(빈 스튜디오는 emptyOut이 audit을 비운다) */
    if (!Array.isArray(d.audit)) d.audit = (S && Array.isArray(S.audit)) ? S.audit.slice() : [];
    if (Array.isArray(d.audit) && !d.audit.some(x => x.seed43)) { const at = (n, h) => `${ad(-n)} ${h}`; const who = '관리자';
      [[1, '10:12', '완료 기준 시청률 80% → 85%'], [2, '16:40', '팝업 추가 — 겨울 특강 얼리버드 신청 안내'], [3, '09:05', '이용약관 새 버전 — 12월 1일 시행'], [4, '14:22', 'MCP 키 발급 — 수납 자동화(Zapier)'], [6, '11:30', '메뉴 켜기 — 마일리지 · 시설'],
        [8, '15:02', '가입 방식 변경 — 자동 수락'], [9, '10:48', '독려 알림 켜기 — 미접속 7일'], [12, '13:15', '학습자 사이트 언어 켜기 — 영어 · 베트남어'], [14, '17:20', '데이터 내보내기(JSON) — 전체'], [16, '09:40', '요금제 확인 — 프리미엄 연간'], [20, '10:00', '기관 유형 · 이름 설정 — 개설'], [21, '11:05', 'AI 튜터 도움 범위 — 힌트만']]
        .forEach(([n, h, w]) => d.audit.push({ at: at(n, h), who, role: 'owner', what: w, seed43: 1 })); }
    if (!Array.isArray(d.apikeys) || !d.apikeys.length) d.apikeys = [{ id: 'k1', name: 'Claude 데스크톱 · 운영팀', prefix: 'dd_live_7Hq2', scope: 'read', created_by: '관리자', created_at: ad(-40), last_used: ad(-1), calls: 1284, revoked_at: null }, { id: 'k2', name: '수납 자동화(Zapier)', prefix: 'dd_live_K9vA', scope: 'write', created_by: '관리자', created_at: ad(-21), last_used: td, calls: 412, revoked_at: null }, { id: 'k3', name: '예전 테스트 키', prefix: 'dd_test_3mPx', scope: 'read', created_by: '관리자', created_at: ad(-120), last_used: ad(-96), calls: 37, revoked_at: ad(-30) }];
  } catch (e) { console.error(e); } return d; }; }
{ const base = emptyOut; emptyOut = function () { const r = base.apply(this, arguments); try { if (S.settings) { S.settings.popups = []; S.settings.termsHist = []; } S.apikeys = []; S.audit = (S.audit || []).filter(x => !x.seed43); } catch (e) { } return r; }; }
/* v43 D-D — 공용 팝업(128~133) 새 디자인: 가입(짙은 사진 패널 · 사진 유형 카드 · 명확한 비활성) · 모달 폭 480 · AI SAM 패널 글자 12px 이상 · 가이드 칩 44px · 계정 메뉴 행 44px.
   공통 CSS(app.css · dds.css · v43ui.css)는 고치지 않고 화면 범위 선택자로 덮어쓴다(마지막에 붙는 style). */
(function () {
  const add = () => { if (document.querySelector('style[data-dd43pop]')) return; let ph = ''; try { ph = window.ddPhoto ? ddPhoto('강의실 교육 수업', 'signup-hero', { size: 'lg' }) : ''; } catch (e) { }
    const st = document.createElement('style'); st.dataset.dd43pop = '1'; st.textContent = `
body.mode-signup{background:var(--bg,#F6F5F1)}
.su{grid-template-columns:minmax(0,1fr) minmax(0,560px);gap:40px;max-width:1360px;padding:32px;align-items:stretch}
.su-l{position:relative;border-radius:32px;overflow:hidden;padding:48px 52px;color:#fff;display:flex;flex-direction:column;justify-content:flex-end;min-height:calc(100vh - 64px);background:#053D1E ${ph ? `url('${ph}') center/cover no-repeat` : ''};box-shadow:0 30px 60px -30px rgba(5,61,30,.55)}
.su-l::before{content:'';position:absolute;inset:0;background:radial-gradient(120% 80% at 100% 0%,rgba(46,224,106,.28),transparent 55%),linear-gradient(180deg,rgba(4,30,14,.35) 0%,rgba(4,30,14,.78) 45%,rgba(4,26,12,.94) 100%)}
.su-l>*{position:relative;z-index:1}
.su-l .brand{position:absolute;top:40px;left:52px;color:#fff}.su-l .brand b{color:#fff;font-size:17px}
.su-l h1{color:#fff;font-size:clamp(40px,4.4vw,60px);font-weight:800;letter-spacing:-.03em;margin:0 0 16px}.su-l h1 em{color:#5CF08E}
.su-l .lead{color:rgba(255,255,255,.86);font-size:17px;line-height:1.6}
.su-l .su-demo .u{background:#00C53B;color:#04140A;font-weight:600}
.su-l .su-demo .a{background:rgba(255,255,255,.12);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);backdrop-filter:blur(10px)}
.su-l .mini-btn{background:#fff;color:#053D1E;border-radius:10px;padding:8px 14px;font-size:13px}
.su-l .note{color:rgba(255,255,255,.78);margin:4px 0 0}.su-l .note a{color:#fff;font-weight:700}
.su-r{border-radius:28px;padding:36px 36px 28px;align-self:center;box-shadow:0 1px 2px rgba(16,24,40,.05),0 24px 60px -24px rgba(16,24,40,.18)}
.su-r h2{font-size:26px;font-weight:800;letter-spacing:-.02em;margin-bottom:20px}
.su-r .tgrid{gap:12px}
.su-r .tcard{border-radius:18px;padding:16px;min-height:118px;box-shadow:inset 0 0 0 1px var(--hair,#E6E8E6);transition:box-shadow .15s,background .15s}
.su-r .tcard:hover{box-shadow:inset 0 0 0 1.5px var(--gr400,#4CC774)}
.su-r .tcard .ti{width:44px;height:44px;border-radius:14px;background:var(--gr50,#EEF9F1);color:var(--gr700,#00752A)}
.su-r .tcard.on{background:var(--gr50,#EEF9F1);box-shadow:inset 0 0 0 2px var(--gr600,#00862D),0 8px 20px -12px rgba(0,134,45,.45)}.su-r .tcard.on .ti{background:var(--gr600,#00862D);color:#fff}
.su-r .tcard p{font-size:13px;line-height:1.5;color:var(--t-sub,#5C6660)}
.su-r .btn.pri.lg{min-height:52px;border-radius:14px;font-size:16px;font-weight:800;width:100%}
.su-r .btn.pri.lg:disabled{background:var(--g200,#ECEEEC);color:var(--g600,#6B746E);box-shadow:inset 0 0 0 1px var(--g300,#DFE2DF);opacity:1;cursor:not-allowed}
.su-r .su-who{font-size:13px}
@media (max-width:960px){.su{grid-template-columns:1fr;padding:16px}.su-l{min-height:0;padding:96px 24px 28px}.su-l .brand{left:24px;top:28px}}
html[data-theme="dark"] .su-r .btn.pri.lg:disabled{background:#13231B;color:#A7B8AD;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
#modal .modal{min-width:min(480px,calc(100vw - 32px))}
#modal .modal .mh h2,#modal .modal .mh h3{font-size:19px;font-weight:800;letter-spacing:-.01em}
#drawer :is(small,kbd,.mg,em),#drawer .ob1 i,.fab-on .bchat :is(small,kbd,.mg,em),.fab-on .bchat .ob1 i{font-size:12px!important}
#drawer :is(.fbi,.eng,.gdbtn,.ob1),.fab-on .bchat :is(.fbi,.eng,.gdbtn,.ob1){position:relative}
#drawer :is(.fbi,.eng,.gdbtn,.ob1)::after,.fab-on .bchat :is(.fbi,.eng,.gdbtn,.ob1)::after{content:'';position:absolute;top:-9px;bottom:-9px;left:-4px;right:-4px}
#drawer .ob1.ok,.fab-on .bchat .ob1.ok{color:var(--gr800,#066B2A)}:is(#drawer,.fab-on .bchat) .ob1.ok i{color:var(--gr800,#066B2A);background:#fff}
html[data-theme="dark"] :is(#drawer,.fab-on .bchat) .ob1.ok{color:#9EF0B8}html[data-theme="dark"] :is(#drawer,.fab-on .bchat) .ob1.ok i{color:#04140A;background:#9EF0B8}
html[data-theme="dark"] .fab-on .bchat :is(b,p,h3,h4){color:var(--g900,#EAF2EC)}
:is(#drawer,.fab-on .bchat) :is(.chip,.scxh){min-height:44px}
:is(#drawer,.fab-on .bchat) .agl{font-size:12px!important;position:relative}:is(#drawer,.fab-on .bchat) .agl::after{content:'';position:absolute;top:-11px;bottom:-11px;left:0;right:0}
#modal .chip,.gd26 .chip{min-height:44px;padding-left:16px;padding-right:16px}
#modal small{font-size:12.5px}
:is(#drawer,.fab-on .bchat) .composer .cbox{border-radius:18px;box-shadow:inset 0 0 0 1px var(--hair,#E1E5E2),0 6px 18px -12px rgba(16,24,40,.25);background:var(--surface)}
:is(#drawer,.fab-on .bchat) .composer .cbox:focus-within{box-shadow:inset 0 0 0 1.5px var(--gr600,#00862D),0 0 0 4px rgba(0,134,45,.12)}
:is(#drawer,.fab-on .bchat) .composer .cbox textarea{border:0!important;box-shadow:none!important;outline:0!important;background:transparent!important;min-width:0;flex:1 1 auto;font-size:15px}
.acp button{min-height:44px;border-radius:10px;font-size:14px}
.acp small{font-size:12px}`; document.head.appendChild(st); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
