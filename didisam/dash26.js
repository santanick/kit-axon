/* 디디쌤 스튜디오 v26.1 — 홈 › 현황을 피그마 '스튜디오 홈(홈페이지 대시보드)' 구성으로
   왼쪽 열: 기관 카드 · 오늘의 할 일 · 온보딩 현황 · 요금제 사용량 · 나의 수익 현황
   오른쪽: 전체 운영 현황(클래스 · 평균 수료율 · 콘텐츠 유형 막대 · 회원 · 수강생) · 주간 신규 가입 추이 + 이번 주 강조 카드
           · [클래스 운영 현황 | 수강생 활동 현황] 탭 — 클래스: 요약 줄 · 클래스별 평균 진도 · 클래스 일정(달력 + 목록) · Top 10 클래스 / 수강생: 기존 상세 지표 그대로
   머리: '홈페이지 대시보드' + 수집 기준 시각 + '운영 현황 엑셀로 내려받기'(CSV) */
'use strict';
const D26 = { plan: { standard: ['스탠다드', 100, 1000], premium: ['프리미엄', 1000, 10000], enterprise: ['엔터프라이즈', 0, 0] } };
const d26n = v => (+v || 0).toLocaleString('ko-KR');
const d26Learners = () => { const s = new Set(); (S.classes || []).forEach(c => (c.learners || []).forEach(id => s.add(id))); return s; };
const d26Avg = c => { const L = c.learners || []; if (!L.length) return 0; return Math.round(L.reduce((a, id) => a + (((c.prog || {})[id] || {}).p || 0), 0) / L.length); };
const d26Done = c => { const thr = (c.criteria && c.criteria.threshold) || 80; return (c.learners || []).filter(id => (((c.prog || {})[id] || {}).p || 0) >= thr).length; };
function d26Kpi() {
  const C = S.classes || [], L = d26Learners(), M = (S.members || []).filter(m => !m.withdrawn);
  const all = C.reduce((a, c) => a + (c.learners || []).length, 0), dn = C.reduce((a, c) => a + d26Done(c), 0);
  const lib = S.lib || []; const kinds = {}; lib.forEach(x => { const k = /영상|YouTube|video|Vimeo/i.test(x.kind || '') ? '영상' : /평가|퀴즈|시험/.test(x.kind || '') ? '평가' : /과제/.test(x.kind || '') ? '과제' : /설문/.test(x.kind || '') ? '설문' : '자료'; kinds[k] = (kinds[k] || 0) + 1; });
  return { cls: C.length, open: C.filter(c => /운영|모집|판매/.test((c.status || '') + (c.sale || ''))).length, rate: all ? Math.round(dn / all * 1000) / 10 : 0, lib: lib.length, kinds, mem: M.length, lrn: L.size };
}
function d26Line(pts, keys, h = 170) { const W = 560, P = 26; const max = Math.max(1, ...pts.flatMap(p => keys.map(k => +p[k] || 0))); const x = i => P + i * ((W - P * 2) / Math.max(1, pts.length - 1)); const y = v => h - 24 - (v / max) * (h - 44);
  const col = ['#5C74F6', '#FF5A4C'];
  return `<svg class="d26-svg" viewBox="0 0 ${W} ${h}" role="img" aria-label="주간 추이">${[0, .5, 1].map(f => `<line x1="${P}" x2="${W - P}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="#EAEBEB"/><text x="2" y="${y(max * f) + 4}" font-size="10" fill="#808181">${Math.round(max * f)}</text>`).join('')}
    ${keys.map((k, j) => `<polyline fill="none" stroke="${col[j]}" stroke-width="2" points="${pts.map((p, i) => `${x(i)},${y(+p[k] || 0)}`).join(' ')}"/>${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(+p[k] || 0)}" r="3" fill="#fff" stroke="${col[j]}" stroke-width="2"/>`).join('')}`).join('')}
    ${pts.map((p, i) => `<text x="${x(i)}" y="${h - 6}" font-size="10" fill="#808181" text-anchor="middle">${esc(String(p.w || p.label || '').slice(-5))}</text>`).join('')}</svg>`; }
function d26Bars(vals, labels, color = '#FF9800', h = 130) { const W = 300, max = Math.max(1, ...vals), bw = (W - 20) / vals.length * .5;
  return `<svg class="d26-svg" viewBox="0 0 ${W} ${h}" role="img" aria-label="수익 추이">${vals.map((v, i) => { const x = 10 + i * ((W - 20) / vals.length) + bw / 2, bh = (v / max) * (h - 34); return `<rect x="${x}" y="${h - 20 - bh}" width="${bw}" height="${bh}" rx="3" fill="${color}"/><text x="${x + bw / 2}" y="${h - 6}" font-size="10" fill="#808181" text-anchor="middle">${esc(labels[i])}</text>`; }).join('')}</svg>`; }
function d26Cal() { const now = new Date(UI.d26m || today()); const y = now.getFullYear(), m = now.getMonth(); const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const ev = []; (S.classes || []).forEach(c => { if (c.start) ev.push({ d: c.start, t: '시작', c }); if (c.end) ev.push({ d: c.end, t: '종료', c }); (c.sessions || []).forEach && (c.sessions || []).forEach(s => s && s.date && ev.push({ d: s.date, t: s.mode === 'live' ? 'LIVE' : '수업', c })); });
  const ym = `${y}-${String(m + 1).padStart(2, '0')}`; const on = new Set(ev.filter(e => String(e.d).startsWith(ym)).map(e => +String(e.d).slice(8, 10)));
  const sel = UI.d26d || today(); const list = ev.filter(e => e.d === sel);
  const cells = Array.from({ length: first }, () => '<span></span>').concat(Array.from({ length: days }, (_, i) => { const d = i + 1, ds = `${ym}-${String(d).padStart(2, '0')}`; return `<button type="button" class="${ds === sel ? 'on' : ''} ${ds === today() ? 'td' : ''}" data-act="d26-day" data-v="${ds}">${d}${on.has(d) ? '<i></i>' : ''}</button>`; }));
  return `<div class="d26-cal"><div class="d26-calh"><button type="button" class="btn sm ghost" data-act="d26-mon" data-v="-1" aria-label="이전 달">‹</button><b>${y}.${String(m + 1).padStart(2, '0')}</b><button type="button" class="btn sm ghost" data-act="d26-mon" data-v="1" aria-label="다음 달">›</button><button type="button" class="btn sm ghost" data-act="d26-mon" data-v="0">오늘</button></div>
    <div class="d26-calg">${['일', '월', '화', '수', '목', '금', '토'].map(w => `<small>${w}</small>`).join('')}${cells.join('')}</div></div>
    <div class="d26-evl"><b>${esc(sel)}</b>${list.length ? list.map(e => `<a href="#" data-act="cls-open" data-v="${esc(e.c.id)}"><span class="tag ${e.t === '종료' ? 'r' : e.t === 'LIVE' ? '' : 'b'}">${esc(e.t)}</span><span>${esc(e.c.name)}</span></a>`).join('') : '<p class="mini">이 날 일정이 없습니다.</p>'}</div>`; }
function d26Left() { const b = (() => { try { return BRIEF().filter(x => x.n > 0).slice(0, 3); } catch (e) { return []; } })();
  const st = S.bld && S.bld.steps ? BLD_STEPS.filter(s => S.bld.steps[s.id] && (S.bld.steps[s.id].on || s.req)) : [];
  const pk = [...(D26.plan[S.org.plan] || ['체험(전체 기능)', 0, 0])]; const L = (S.members || []).length, msg = typeof cmMonthUsed === 'function' ? cmMonthUsed() : (S.msgs || []).reduce((a, x) => a + (+x.n || 0), 0); if (typeof cmLimit === 'function') pk[2] = cmLimit(); /* v26.8: 메시지 페이지와 같은 기준(이번 달 · 같은 한도), 플랜 인원은 회원 수 */
  const pays = (S.pays || []).filter(p => /완료/.test(p.status || '')); const mo = today().slice(0, 7); const sum = pays.filter(p => String(p.at || '').startsWith(mo)).reduce((a, p) => a + (+p.amount || 0), 0);
  const wk = [4, 3, 2, 1, 0].map(k => { const e = new Date(Date.now() - k * 7 * 864e5), s = new Date(e.getTime() - 7 * 864e5); return { l: `${s.getMonth() + 1}/${s.getDate()}`, v: pays.filter(p => { const t = new Date(p.at || 0); return t > s && t <= e; }).reduce((a, p) => a + (+p.amount || 0), 0) }; });
  const bar = (n, max) => `<span class="d26-meter"><i style="width:${max ? Math.min(100, Math.round(n / max * 100)) : 0}%"></i></span>`;
  return `<aside class="d26-left">
    <div class="card d26-org">${S.org.logo ? `<img src="${esc(S.org.logo)}" alt="">` : `<span class="d26-logo">${esc((S.org.name || '').slice(0, 2))}</span>`}<b>${esc(S.org.name)}</b>${tag(S.lsite && S.lsite.pub ? "운영중" : "게시 전", S.lsite && S.lsite.pub ? 'g' : 'y')}
      <div class="d26-todo"><h3>오늘의 할 일</h3>${b.length ? b.map(x => `<button type="button" data-act="chat-q" data-v="${esc(x.q)}"><span>${esc(x.label)}</span><u>${x.n}${esc(x.unit || '건')}</u></button>`).join('') : '<p class="mini">처리할 일이 없습니다.</p>'}</div></div>
    ${st.length ? `<div class="card d26-ob"><div class="ch"><b>온보딩 현황</b><small>${st.filter(s => S.bld.steps[s.id].done).length}/${st.length} 완료</small></div>${bar(st.filter(s => S.bld.steps[s.id].done).length, st.length)}<ul>${st.map(s => `<li class="${S.bld.steps[s.id].done ? 'ok' : ''}"><button type="button" data-act="go" data-v="${esc(s.view)}"><span>${esc(bName(s))}</span>${S.bld.steps[s.id].done ? ic('check', 15) : '<em>↗</em>'}</button></li>`).join('')}</ul></div>` : ''}
    <div class="card d26-plan"><small class="d26-cap">요금제</small><div class="ch"><b>${esc(pk[0])} 플랜을<br>이용 중이에요.</b><span class="sp"></span><button class="btn sm pri" data-act="go" data-v="plan">업그레이드</button></div>
      <div class="d26-use"><small>회원 수 <em>${d26n(L)}${pk[1] ? '/' + d26n(pk[1]) : ''}명</em></small>${bar(L, pk[1] || L * 1.5 || 1)}<small>이번 달 메시지 <em>${d26n(msg)}${pk[2] ? '/' + d26n(pk[2]) : ''}건</em></small>${bar(msg, pk[2] || msg * 1.5 || 1)}<small>콘텐츠 <em>${d26n((S.lib || []).length)}개</em></small>${bar((S.lib || []).length, Math.max(50, (S.lib || []).length * 1.5))}</div></div>
    <div class="card d26-rev"><div class="ch"><b>나의 수익 현황</b><span class="sp"></span><button class="btn sm" data-act="go" data-v="sales">자세히 보기</button></div><small>이번 달 결제 금액</small><strong>${d26n(sum)}원</strong>${d26Bars(wk.map(x => x.v), wk.map(x => x.l))}</div>
  </aside>`; }
function d26Main(base) { const k = d26Kpi(); const tab = UI.d26t || 'cls';
  const kc = { 영상: '#5C74F6', 자료: '#63B8F4', 과제: '#71D87C', 평가: '#FFA826', 설문: '#FF7A73' }; const kt = Object.entries(k.kinds);
  const bdOn = typeof menuOn === 'function' ? menuOn('badge') : true; const wk = (S.weeks || []).slice(-8); const last = wk[wk.length - 1] || {}, prev = wk[wk.length - 2] || {}; const ch = prev.join ? Math.round(((last.join || 0) - prev.join) / prev.join * 100) : 0;
  const C = [...(S.classes || [])].sort((a, b) => UI.d26s === 'rate' ? d26Avg(b) - d26Avg(a) : (b.learners || []).length - (a.learners || []).length).slice(0, 10);
  const medal = i => ['🥇', '🥈', '🥉'][i] || `${i + 1}위`;
  return `<div class="d26-main">
    <section class="card d26-kpi"><h3>전체 운영 현황</h3><div class="d26-kg">
      <div><small>${ic('book', 15)} ${esc(t('cls'))}</small><b>${d26n(k.cls)}<em>개</em></b></div><div><small>${ic('chart', 15)} 전체 평균 수료율</small><b>${k.rate}<em>%</em></b></div>
      <div class="wide"><small>${ic('grid', 15)} 콘텐츠</small><b>${d26n(k.lib)}<em>개</em></b>${k.lib ? `<span class="d26-stack">${kt.map(([n, v]) => `<i style="flex:${v};background:${kc[n] || '#C8C9C9'}" title="${esc(n)} ${v}"></i>`).join('')}</span><span class="d26-leg">${kt.map(([n, v]) => `<span><i style="background:${kc[n] || '#C8C9C9'}"></i>${esc(n)} <b>${v}</b></span>`).join('')}</span>` : ''}</div>
      <div><small>${ic('users', 15)} 회원</small><b>${d26n(k.mem)}<em>명</em></b></div><div><small>${ic('users', 15)} ${esc(t('learner'))}</small><b>${d26n(k.lrn)}<em>명</em></b></div></div></section>
    ${wk.length ? `<section class="d26-row"><div class="card d26-trend"><div class="ch"><b>주간 신규 가입${bdOn ? ' · 배지 발급' : ''}</b><small>최근 ${wk.length}주</small><span class="sp"></span><span class="d26-lg"><i style="background:#5C74F6"></i>신규 가입${bdOn ? ' <i style="background:#FF5A4C"></i>배지 발급' : ''}</span></div>${d26Line(wk, bdOn ? ['join', 'badge'] : ['join'])}</div>
      <div class="d26-hl"><small>이번 주 신규 가입</small><strong>${d26n(last.join || 0)}<em>명</em></strong><span>${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch)}%</span><p>지난주보다 ${ch >= 0 ? '늘었어요' : '줄었어요'}. ${esc(t('learner'))} 초대 링크를 공유하면 더 늘릴 수 있어요.</p></div></section>` : ''}
    <section class="card d26-tabs"><div class="seg2 wtabs"><button class="${tab === 'cls' ? 'on' : ''}" data-act="d26-tab" data-v="cls">${esc(t('cls'))} 운영 현황</button><button class="${tab === 'lrn' ? 'on' : ''}" data-act="d26-tab" data-v="lrn">${esc(t('learner'))} 활동 현황</button></div>
      ${tab === 'cls' ? `<div class="d26-strip"><span>전체 ${esc(t('cls'))} <b>${k.cls}개</b></span><span>수강 가능 ${esc(t('cls'))} <b>${k.open}개</b></span><span>평균 수료율 <b>${k.rate}%</b></span><button class="btn sm ghost" data-act="go" data-v="class">${esc(t('cls'))} 관리 바로가기 ›</button></div>
        <div class="d26-two"><div><h4>${esc(t('cls'))}별 평균 진도</h4>${(S.classes || []).slice(0, 8).map(c => `<div class="d26-pr"><span>${esc(c.name)}</span>${bar(d26Avg(c))}<b>${d26Avg(c)}%</b></div>`).join('') || '<p class="mini">아직 없습니다.</p>'}</div><div><h4>${esc(t('cls'))} 일정</h4><div class="d26-calw">${d26Cal()}</div></div></div>
        <div class="d26-top"><div class="ch"><b>Top 10 ${esc(t('cls'))}</b><small>수강 인원 · 평균 진도로 운영 현황을 비교합니다</small><span class="sp"></span><select data-chg="d26-sort" aria-label="정렬"><option value="n" ${UI.d26s !== 'rate' ? 'selected' : ''}>${esc(t('learner'))} 많은 순</option><option value="rate" ${UI.d26s === 'rate' ? 'selected' : ''}>평균 진도 높은 순</option></select></div>
          <div class="tw"><table><thead><tr><th>순위</th><th>${esc(t('cls'))}명</th><th>평균 진도</th><th>수료</th><th>수강 인원</th></tr></thead><tbody>${C.map((c, i) => `<tr><td>${medal(i)}</td><td><a href="#" data-act="cls-open" data-v="${esc(c.id)}"><b>${esc(c.name)}</b></a></td><td>${d26Avg(c)}%</td><td>${d26Done(c)}명</td><td>${(c.learners || []).length}명</td></tr>`).join('') || `<tr><td colspan="5"><div class="empty">${esc(t('cls'))}을 만들면 여기에 순위가 보입니다.</div></td></tr>`}</tbody></table></div></div>` : `<div class="d26-old">${base}</div>`}
    </section></div>`;
  function bar(p) { return `<span class="d26-meter"><i style="width:${Math.min(100, p)}%"></i></span>`; } }
{ const base = VIEWS.dash; VIEWS.dash = () => { let old = ''; try { old = base(); } catch (e) { console.error(e); }
  try { const now = new Date(); const ts = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const body = old.replace(/^[\s\S]*?<\/div><\/div>/, m => /class="ph"/.test(m) ? '' : m); /* 기존 머리 제거, 본문만 '활동 현황' 탭에 */
    return head('홈페이지 대시보드', `수집 기준 시각 ${ts} · 운영 현황을 한눈에 봅니다.`, `<button class="btn pri" data-act="d26-xls">${ic('download', 15)} 운영 현황 엑셀로 내려받기</button>`) + `<div class="d26">${d26Left()}${d26Main(body)}</div>`;
  } catch (e) { console.error(e); return old; } }; }
ACT['d26-tab'] = el => { UI.d26t = el.dataset.v; render(); };
ACT['d26-sort'] = el => { UI.d26s = el.value; render(); };
ACT['d26-day'] = el => { UI.d26d = el.dataset.v; render(); };
ACT['d26-mon'] = el => { const v = +el.dataset.v; if (!v) { UI.d26m = today(); UI.d26d = today(); } else { const d = new Date(UI.d26m || today()); d.setDate(1); d.setMonth(d.getMonth() + v); UI.d26m = d.toISOString().slice(0, 10); } render(); };
ACT['d26-xls'] = () => { const k = d26Kpi(); const rows = [['구분', '값'], [t('cls') + ' 수', k.cls], ['수강 가능 ' + t('cls'), k.open], ['전체 평균 수료율(%)', k.rate], ['콘텐츠', k.lib], ['회원', k.mem], [t('learner'), k.lrn], [], [t('cls') + '명', '수강 인원', '평균 진도(%)', '수료']].concat((S.classes || []).map(c => [c.name, (c.learners || []).length, d26Avg(c), d26Done(c)]));
  const csv = '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${S.org.name}_운영현황_${today()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('운영 현황을 내려받았습니다(엑셀에서 열 수 있는 CSV).', 'ok'); };
