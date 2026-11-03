/* 디디쌤 스튜디오 v26 — 피그마(스튜디오 · 클래스 관리 상세) 대조 보강
   - 클래스 상세 머리: '수강생 화면 보기'(학습자 사이트의 이 클래스 페이지를 새 창으로) · '공유하기'(클래스 주소 복사, 무료 클래스도) · 카테고리 표시(미지정이면 '카테고리 미지정' → 누르면 설정 탭)
   - 클래스 상세 수강생 표 아래: '수료율 집계 일시'(마지막 계산 시각) */
'use strict';
Object.assign(IC, { folder: IC.folder || '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', eye: IC.eye || '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', link: IC.link || '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>' });
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
