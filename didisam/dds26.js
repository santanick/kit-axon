/* 디디쌤 스튜디오 v26 — 피그마(스튜디오 · 클래스 관리 상세) 대조 보강
   - 클래스 상세 머리: '수강생 화면 보기'(학습자 사이트의 이 클래스 페이지를 새 창으로) · '공유하기'(클래스 주소 복사, 무료 클래스도) · 카테고리 표시(미지정이면 '카테고리 미지정' → 누르면 설정 탭)
   - 클래스 상세 수강생 표 아래: '수료율 집계 일시'(마지막 계산 시각) */
'use strict';
Object.assign(IC, { download: IC.download || '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', award: IC.award || '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>', info: IC.info || '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>', folder: IC.folder || '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', eye: IC.eye || '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', link: IC.link || '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>' });
const d26ClsURL = c => (typeof c2PayLink === 'function' ? c2PayLink(c) : `learner.html#class/${c.id}`);
const d26CatName = id => { const L = S.cats || []; const out = []; let x = L.find(k => k.id === id); while (x) { out.unshift(x.name); x = x.parent ? L.find(k => k.id === x.parent) : null; } return out.join(' › '); };
AFTER.push(cur => {
  try {
    if (!S || !S.org || cur.tab !== 'class' || !UI.cls) return; const c = C(UI.cls); if (!c) return;
    const ph = [...document.querySelectorAll('#main .ph')].find(p => (p.querySelector('h1,h2') || {}).textContent === c.name) || document.querySelector('#main .ph:has([data-act=c2-paylink])');
    const phr = ph && ph.querySelector('.phr'); if (!phr || phr.querySelector('[data-act=d26-view]')) return;
    const cat = c.cat ? d26CatName(c.cat) : '';
    phr.insertAdjacentHTML('afterbegin', `<button class="btn sm ghost d26-cat" data-act="d26-cat" title="카테고리 바꾸기">${ic('folder', 14)} ${esc(cat || '카테고리 미지정')}</button><button class="btn sm ghost" data-act="d26-view" data-v="${esc(c.id)}">${ic('eye', 14)} ${esc(t('learner'))} 화면 보기</button><button class="btn sm ghost" data-act="d26-share" data-v="${esc(c.id)}">${ic('link', 14)} 공유하기</button>`);
    const tw = document.querySelector('#main .c2lt, #main .tw'); if (tw && (UI.clsT || 'learners') === 'learners' && !document.querySelector('.d26-agg')) tw.insertAdjacentHTML('afterend', `<p class="mini d26-agg">수료율 집계 일시: ${esc(new Date().toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }))} · 진도는 ${esc(t('learner'))}가 학습할 때마다 바로 반영됩니다.</p>`);
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
    <div class="d26-cb"><div class="d26-tags">${tag(c.open === '비공개' ? '비공개' : '공개', c.open === '비공개' ? '' : 'g')}${c.sale ? tag(c.sale, c.sale === '판매중' ? 'g' : c.sale === '판매 종료' ? 'r' : 'y') : ''}${c.status ? tag(c.status, c.status === '운영중' ? 'b' : '') : ''}${c.legal ? tag('법정', 'r') : ''}</div>
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
  if (eb && bk26Active(b).length) { modal('삭제할 수 없습니다', `<p>아직 다운로드 기간이 남은 ${esc(t('learner'))}이 있습니다. 모든 ${esc(t('learner'))}의 다운로드 기간 마감 후 삭제할 수 있습니다.</p>`, [{ id: 'ok', label: '확인', kind: 'pri' }]); return; }
  if (!eb && ((b.grants || []).some(g => !g.off) || (b.ship || []).length)) { modal('삭제할 수 없습니다', `<p>이 교재를 결제/신청한 ${esc(t('learner'))}이 있어 삭제가 불가능합니다. 비공개로 전환하면 새로 판매되지 않습니다.</p>`, [{ id: 'ok', label: '확인', kind: 'pri' }]); return; }
  modal('교재 삭제', `<p>「${esc(b.name)}」을(를) 삭제합니다. 삭제하면 되돌릴 수 없습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { S.books = S.books.filter(x => x !== b); logAudit('교재 삭제 — ' + b.name); save(); render(); toast('교재를 삭제했습니다.', 'ok'); } }]); };
ACT['bk26-open'] = el => { const b = S.books.find(x => x.id === el.dataset.v); if (!b) return; const eb = b.kind === '전자책';
  if (b.open === '비공개') { b.open = '공개'; logAudit('교재 공개 — ' + b.name); save(); render(); toast('교재 상태를 공개로 전환하였습니다.', 'ok'); return; }
  b.open = '비공개'; logAudit('교재 비공개 — ' + b.name); save(); render(); toast(eb ? '교재 상태를 비공개로 전환하였습니다. 다운로드 기간이 남아 있는 수강생은 계속해서 교재를 다운받을 수 있습니다.' : '교재 상태를 비공개로 전환하였습니다. 전달 완료되지 않은 수강생들은 교재 내용을 확인할 수 있습니다.', 'ok'); };
AFTER.push(() => { try { if (!CUR || CUR.tab !== 'book' || !Array.isArray(S.books)) return; document.querySelectorAll('#main [data-act="sl2-bked"]').forEach(btn => { if (btn.parentElement.querySelector('[data-act="bk26-del"]')) return; const b = S.books.find(x => x.id === btn.dataset.v); if (!b) return;
  btn.insertAdjacentHTML('afterend', `<button class="btn sm ghost" data-act="bk26-open" data-v="${esc(b.id)}">${b.open === '비공개' ? '공개로 전환' : '비공개'}</button><button class="btn sm redl" data-act="bk26-del" data-v="${esc(b.id)}">삭제</button>`); }); } catch (e) { console.error(e); } });
