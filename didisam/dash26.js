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
const d26Done = c => doneN(c); /* v36 R1 이수 판정 한 곳(clsDone) */
function d26Kpi() {
  const C = S.classes || [], L = d26Learners(), M = (S.members || []).filter(m => !m.withdrawn);
  const all = C.reduce((a, c) => a + (c.learners || []).length, 0), dn = C.reduce((a, c) => a + d26Done(c), 0);
  const lib = S.lib || []; const kinds = {}; lib.forEach(x => { const k = /영상|YouTube|video|Vimeo/i.test(x.kind || '') ? '영상' : /평가|퀴즈|시험/.test(x.kind || '') ? '평가' : /과제/.test(x.kind || '') ? '과제' : /설문/.test(x.kind || '') ? '설문' : '자료'; kinds[k] = (kinds[k] || 0) + 1; });
  return { cls: C.length, open: C.filter(c => /운영|모집|판매/.test((c.status || '') + (c.sale || ''))).length, rate: all ? Math.round(dn / all * 1000) / 10 : 0, lib: lib.length, kinds, mem: M.length, lrn: L.size };
}
function d26Line(pts, keys, h = 170) { const W = 560, P = 26; const max = Math.max(1, ...pts.flatMap(p => keys.map(k => +p[k] || 0))); const x = i => P + i * ((W - P * 2) / Math.max(1, pts.length - 1)); const y = v => h - 24 - (v / max) * (h - 44);
  const col = ['var(--c-data)', 'var(--c-warn)'];
  return `<svg class="d26-svg" viewBox="0 0 ${W} ${h}" role="img" aria-label="주간 추이">${[0, .5, 1].map(f => `<line x1="${P}" x2="${W - P}" y1="${y(max * f)}" y2="${y(max * f)}" style="stroke:var(--c-grid)"/><text x="2" y="${y(max * f) + 4}" font-size="12" style="fill:var(--c-axis)">${Math.round(max * f)}</text>`).join('')}
    ${keys.map((k, j) => `<polyline fill="none" style="stroke:${col[j]}" stroke-width="2" points="${pts.map((p, i) => `${x(i)},${y(+p[k] || 0)}`).join(' ')}"/>${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(+p[k] || 0)}" r="3" style="fill:var(--surface);stroke:${col[j]}" stroke-width="2"/>`).join('')}`).join('')}
    ${pts.map((p, i) => `<text x="${x(i)}" y="${h - 6}" font-size="12" style="fill:var(--c-axis)" text-anchor="middle">${esc(String(p.w || p.label || '').slice(-5))}</text>`).join('')}</svg>`; }
function d26Bars(vals, labels, color = 'var(--c-data)', h = 130) { const W = 300, max = Math.max(1, ...vals), bw = (W - 20) / vals.length * .5;
  return `<svg class="d26-svg" viewBox="0 0 ${W} ${h}" role="img" aria-label="수익 추이">${vals.map((v, i) => { const x = 10 + i * ((W - 20) / vals.length) + bw / 2, bh = (v / max) * (h - 34); return `<rect x="${x}" y="${h - 20 - bh}" width="${bw}" height="${bh}" rx="3" style="fill:${color}"/><text x="${x + bw / 2}" y="${h - 6}" font-size="12" style="fill:var(--c-axis)" text-anchor="middle">${esc(labels[i])}</text>`; }).join('')}</svg>`; }
function d26Cal() { const now = new Date(UI.d26m || today()); const y = now.getFullYear(), m = now.getMonth(); const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const ev = []; (S.classes || []).forEach(c => { if (c.start) ev.push({ d: c.start, t: '시작', c }); if (c.end) ev.push({ d: c.end, t: '종료', c }); (c.sessions || []).forEach && (c.sessions || []).forEach(s => s && s.date && ev.push({ d: s.date, t: s.mode === 'live' ? 'LIVE' : '수업', c })); });
  const ym = `${y}-${String(m + 1).padStart(2, '0')}`; const on = new Set(ev.filter(e => String(e.d).startsWith(ym)).map(e => +String(e.d).slice(8, 10)));
  const sel = UI.d26d || today(); const list = ev.filter(e => e.d === sel);
  const cells = Array.from({ length: first }, () => '<span></span>').concat(Array.from({ length: days }, (_, i) => { const d = i + 1, ds = `${ym}-${String(d).padStart(2, '0')}`; return `<button type="button" class="${ds === sel ? 'on' : ''} ${ds === today() ? 'td' : ''}" data-act="d26-day" data-v="${ds}">${d}${on.has(d) ? '<i></i>' : ''}</button>`; }));
  return `<div class="d26-cal"><div class="d26-calh"><button type="button" class="btn sm ghost" data-act="d26-mon" data-v="-1" aria-label="이전 달">‹</button><b>${y}.${String(m + 1).padStart(2, '0')}</b><button type="button" class="btn sm ghost" data-act="d26-mon" data-v="1" aria-label="다음 달">›</button><button type="button" class="btn sm ghost" data-act="d26-mon" data-v="0">오늘</button></div>
    <div class="d26-calg">${['일', '월', '화', '수', '목', '금', '토'].map(w => `<small>${w}</small>`).join('')}${cells.join('')}</div></div>
    <div class="d26-evl"><b>${esc(sel)}</b>${list.length ? list.map(e => `<a href="#" data-act="cls-open" data-v="${esc(e.c.id)}"><span class="tag ${e.t === '종료' ? 'r' : e.t === 'LIVE' ? '' : 'b'}">${esc(e.t)}</span><span>${esc(e.c.name)}</span></a>`).join('') : '<p class="mini">이 날 일정이 없습니다.</p>'}</div>`; }
function d26Left() { const b = (() => { try { return BRIEF().filter(x => x.n > 0).slice(0, 3); } catch (e) { return []; } })();
  const st = S.bld && S.bld.steps ? (typeof bList === 'function' ? bList() : BLD_STEPS.filter(s => S.bld.steps[s.id] && (S.bld.steps[s.id].on || s.req))) : []; /* v38: 머리 시작 가이드와 같은 단계 목록 */
  const pk = [...(D26.plan[S.org.plan] || ['', 0, 0])]; const L = (S.members || []).length, msg = typeof cmMonthUsed === 'function' ? cmMonthUsed() : (S.msgs || []).reduce((a, x) => a + (+x.n || 0), 0); if (typeof cmLimit === 'function') pk[2] = cmLimit(); /* v26.8: 메시지 페이지와 같은 기준(이번 달 · 같은 한도), 플랜 인원은 회원 수 */
  const pays = (S.pays || []).filter(p => /완료/.test(p.status || '')); const mo = today().slice(0, 7); const sum = pays.filter(p => String(p.at || '').startsWith(mo)).reduce((a, p) => a + (+p.amount || 0), 0);
  const wk = [4, 3, 2, 1, 0].map(k => { const e = new Date(Date.now() - k * 7 * 864e5), s = new Date(e.getTime() - 7 * 864e5); return { l: `${s.getMonth() + 1}/${s.getDate()}`, v: pays.filter(p => { const t = new Date(p.at || 0); return t > s && t <= e; }).reduce((a, p) => a + (+p.amount || 0), 0) }; });
  const d26Ob = id => { try { if (typeof bDone === 'function') return !!bDone(id); } catch (e) { } return !!(S.bld.steps[id] || {}).done; }; /* v38 P-16: 머리의 '시작 가이드 n/4'와 같은 판정(bDone) */
  const bar = (n, max) => `<span class="d26-meter"><i style="width:${max ? Math.min(100, Math.round(n / max * 100)) : 0}%"></i></span>`;
  return `<aside class="d26-left">
    <div class="card d26-org">${S.org.logo ? `<img src="${esc(S.org.logo)}" alt="">` : (() => { /* v43 R6: 로고가 없으면 회색 글자 상자 대신 기관 유형 사진 카드 + 이니셜 배지 */ let u = ''; try { u = window.V4 && V4.photo ? V4.photo(({ k12: '교실 수업', adult: '강의실 성인 학습', univ: '대학 캠퍼스', corp: '회의 업무', voc: '실습 작업장', lifelong: '평생교육 강좌', public: '도서관' })[S.org.type] || '교실', 'd26org') : ''; } catch (e) { } return u ? `<span class="d26-ophoto" style="background-image:url('${esc(u)}')"><span class="d26-oini">${esc((S.org.name || '').slice(0, 2))}</span></span>` : `<span class="d26-logo">${esc((S.org.name || '').slice(0, 2))}</span>`; })()}<b>${esc(S.org.name)}</b>${tag(S.lsite && S.lsite.pub ? "운영중" : "게시 전", S.lsite && S.lsite.pub ? 'g' : 'y')}
      <div class="d26-todo"><h3>오늘의 할 일</h3>${b.length ? b.map(x => `<button type="button" data-act="chat-q" data-v="${esc(x.q)}"><span>${esc(x.label)}</span><u>${x.n}${esc(x.unit || '건')}</u></button>`).join('') : '<p class="mini">처리할 일이 없습니다.</p>'}</div></div>
    ${st.length ? `<div class="card d26-ob"><div class="ch"><b>온보딩 현황</b><small>${st.filter(s => d26Ob(s.id)).length}/${st.length} 완료</small></div>${bar(st.filter(s => d26Ob(s.id)).length, st.length)}<ul>${st.map(s => `<li class="${d26Ob(s.id) ? 'ok' : ''}"><button type="button" data-act="go" data-v="${esc(s.view)}"><span>${esc(bName(s))}</span>${d26Ob(s.id) ? ic('check', 15) : '<em>↗</em>'}</button></li>`).join('')}</ul></div>` : ''}
    ${d26PlanCard(L, msg, pk[2])}
    ${typeof mbPayOn === 'function' && !mbPayOn() ? '' : `<div class="card d26-rev"><div class="ch"><b>나의 수익 현황</b><span class="sp"></span><button class="btn sm" data-act="go" data-v="sales">자세히 보기</button></div><small>이번 달 결제 금액</small><strong>${d26n(sum)}원</strong>${d26Bars(wk.map(x => x.v), wk.map(x => x.l))}</div>`}
  </aside>`; }
function d26Main(base) { const k = d26Kpi(); const tab = UI.d26t || 'cls';
  const kc = { 영상: 'var(--c-data)', 자료: 'var(--gr300)', 과제: 'var(--gr800)', 평가: 'var(--c-warn)', 설문: 'var(--c-prev)' }; const kt = Object.entries(k.kinds);
  const bdOn = typeof menuOn === 'function' ? menuOn('badge') : true; const wk = (S.weeks || []).slice(-8); const last = wk[wk.length - 1] || {}, prev = wk[wk.length - 2] || {}; const ch = prev.join ? Math.round(((last.join || 0) - prev.join) / prev.join * 100) : 0;
  const C = [...(S.classes || [])].sort((a, b) => UI.d26s === 'rate' ? d26Avg(b) - d26Avg(a) : (b.learners || []).length - (a.learners || []).length).slice(0, 10);
  const medal = i => `<span class="d26-rk ${i < 3 ? 't' : ''}">${i + 1}</span>`;
  return `<div class="d26-main">
    <section class="card d26-kpi"><h3>전체 운영 현황</h3><div class="d26-kg">
      <div><small>${ic('book', 15)} ${esc(t('cls'))}</small><b>${d26n(k.cls)}<em>개</em></b></div><div><small>${ic('chart', 15)} 전체 평균 수료율</small><b>${k.rate}<em>%</em></b></div>
      <div class="wide"><small>${ic('grid', 15)} 콘텐츠</small><b>${d26n(k.lib)}<em>개</em></b>${k.lib ? `<span class="d26-stack">${kt.map(([n, v]) => `<i style="flex:${v};background:${kc[n] || 'var(--c-prev)'}" title="${esc(n)} ${v}"></i>`).join('')}</span><span class="d26-leg">${kt.map(([n, v]) => `<span><i style="background:${kc[n] || 'var(--c-prev)'}"></i>${esc(n)} <b>${v}</b></span>`).join('')}</span>` : ''}</div>
      <div><small>${ic('users', 15)} 회원</small><b>${d26n(k.mem)}<em>명</em></b></div><div><small>${ic('users', 15)} ${esc(t('learner'))}</small><b>${d26n(k.lrn)}<em>명</em></b></div></div></section>
    ${wk.length ? `<section class="d26-row"><div class="card d26-trend"><div class="ch"><b>주간 신규 가입${bdOn ? ' · 배지 발급' : ''}</b><small>최근 ${wk.length}주</small><span class="sp"></span><span class="d26-lg"><i style="background:var(--c-data)"></i>신규 가입${bdOn ? ' <i style="background:var(--c-warn)"></i>배지 발급' : ''}</span></div>${d26Line(wk, bdOn ? ['join', 'badge'] : ['join'])}</div>
      <div class="d26-hl"><small>이번 주 신규 가입</small><strong>${d26n(last.join || 0)}<em>명</em></strong><span>${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch)}%</span><p>지난주보다 ${ch >= 0 ? '늘었어요' : '줄었어요'}. ${esc(t('learner'))} 초대 링크를 공유하면 더 늘릴 수 있어요.</p></div></section>` : ''}
    <section class="card d26-tabs"><div class="seg2 wtabs"><button class="${tab === 'cls' ? 'on' : ''}" data-act="d26-tab" data-v="cls">${esc(t('cls'))} 운영 현황</button><button class="${tab === 'lrn' ? 'on' : ''}" data-act="d26-tab" data-v="lrn">${esc(t('learner'))} 활동 현황</button></div>
      ${tab === 'cls' ? `<div class="d26-strip"><span>전체 ${esc(t('cls'))} <b>${k.cls}개</b></span><span>수강 가능 ${esc(t('cls'))} <b>${k.open}개</b></span><span>평균 수료율 <b>${k.rate}%</b></span><button class="btn sm ghost" data-act="go" data-v="class">${esc(t('cls'))} 관리 바로가기 ›</button></div>
        <div class="d26-two"><div><h4>${esc(t('cls'))}별 평균 진도</h4>${(S.classes || []).slice(0, 8).map(c => `<div class="d26-pr"><span>${esc(c.name)}</span>${bar(d26Avg(c))}${d26Avg(c) ? `<b>${d26Avg(c)}%</b>` : '<b class="z">시작 전</b>'}</div>`).join('') || '<p class="mini">아직 없습니다.</p>'}</div><div><h4>${esc(t('cls'))} 일정</h4><div class="d26-calw">${d26Cal()}</div></div></div>
        <div class="d26-top"><div class="ch"><b>Top 10 ${esc(t('cls'))}</b><small>수강 인원 · 평균 진도로 운영 현황을 비교합니다</small><span class="sp"></span><select data-chg="d26-sort" aria-label="정렬"><option value="n" ${UI.d26s !== 'rate' ? 'selected' : ''}>${esc(t('learner'))} 많은 순</option><option value="rate" ${UI.d26s === 'rate' ? 'selected' : ''}>평균 진도 높은 순</option></select></div>
          <div class="tw"><table><thead><tr><th>순위</th><th>${esc(t('cls'))}명</th><th>평균 진도</th><th>수료</th><th>수강 인원</th></tr></thead><tbody>${C.map((c, i) => `<tr><td>${medal(i)}</td><td><a href="#" data-act="cls-open" data-v="${esc(c.id)}"><b>${esc(c.name)}</b></a></td><td>${d26Avg(c) ? d26Avg(c) + '%' : '시작 전'}</td><td>${d26Done(c) ? d26Done(c) + '명' : '아직 없음'}</td><td>${(c.learners || []).length}명</td></tr>`).join('') || `<tr><td colspan="5"><div class="empty">${esc(tj('cls', '을'))} 만들면 여기에 순위가 보입니다.</div></td></tr>`}</tbody></table></div></div>` : `<div class="d26-old">${base}</div>`}
    </section></div>`;
  function bar(p) { return `<span class="d26-meter"><i style="width:${Math.min(100, p)}%"></i></span>`; } }
/* v43 현황 상단(최종 시안 2판): 한 문장 브리핑 · KPI 4칸(스파크라인) · 그라데이션 면적 차트(툴팁) · 도넛 · 퍼널 — v43ui.js(V4) 패턴 */
function d43Data() { const k = d26Kpi(); const C = S.classes || []; const wk = (S.weeks || []).slice(-8); const last = wk[wk.length - 1] || {}, prev = wk[wk.length - 2] || {};
  const ch = prev.join ? Math.round(((last.join || 0) - prev.join) / prev.join * 100) : null;
  const pays = (S.pays || []).filter(p => /완료/.test(p.status || '')); const mo = today().slice(0, 7); const sum = pays.filter(p => String(p.at || '').startsWith(mo)).reduce((a, p) => a + (+p.amount || 0), 0);
  const pw = [5, 4, 3, 2, 1, 0].map(n => { const e = new Date(Date.now() - n * 7 * 864e5), st = new Date(e.getTime() - 7 * 864e5); return pays.filter(p => { const t = new Date(p.at || 0); return t > st && t <= e; }).reduce((a, p) => a + (+p.amount || 0), 0); });
  const H = new Set(), Dn = new Set(); C.forEach(c => (c.learners || []).forEach(id => { if ((((c.prog || {})[id] || {}).p || 0) >= 50) H.add(id); try { if (typeof clsDone === 'function' && clsDone(c, id)) Dn.add(id); } catch (e) { } })); const half = H.size;
  const enr = C.reduce((a, c) => a + (c.learners || []).length, 0), dn = C.reduce((a, c) => a + d26Done(c), 0);
  return { k, wk, ch, sum, pw, half, enr, dn, dnU: Dn.size, last }; }
function d43Head(d) { if (!window.V4) return ''; const { k, ch, last } = d;
  if (!k.cls && !k.mem) return V4.head({ eb: `${V4.ai()} 오늘의 현황`, h: `아직 볼 숫자가 없습니다.<br><em>첫 ${esc(t('cls'))}</em>을 열면 여기부터 채워집니다.`, acts: `<button class="btn pri" data-act="go" data-v="class">${esc(t('cls'))} 만들기</button>` });
  return V4.head({ eb: `${V4.ai()} 오늘의 현황 · ${esc(today())}`, h: `이번 주 신규 가입 <em>${d26n(last.join || 0)}명</em>, 평균 수료율은 <em class="${k.rate < 50 ? 'co' : ''}">${k.rate}%</em>입니다.`, sub: `${ch != null ? `신규 가입은 지난주보다 ${Math.abs(ch)}% ${ch >= 0 ? '늘었습니다' : '줄었습니다'}. ` : ''}${esc(t('cls'))} ${d26n(k.cls)}개 · ${esc(t('learner'))} ${d26n(k.lrn)}명을 운영 중입니다.`, acts: window.L43 && L43.acts ? L43.acts([{ label: '오늘 할 일 처리하기', tab: 'home' }, { label: '운영 현황 엑셀', kind: 'sec', go: '[data-act="d26-xls"]' }]) : '' }); }
function d43Top(d) { if (!window.V4) return ''; const { k, wk, ch, sum, pw, half, enr, dn, dnU } = d; const bdOn = typeof menuOn === 'function' ? menuOn('badge') : true;
  const cum = []; let c0 = Math.max(0, k.mem - wk.reduce((a, w) => a + (+w.join || 0), 0)); wk.forEach(w => { c0 += +w.join || 0; cum.push(c0); });
  const kpis = `<div class="v4-kpis d43-kpis">${V4.kpi({ l: '회원', icon: 'users', v: d26n(k.mem), u: '명', delta: ch, spark: cum.length > 1 ? cum : null, sub: `이번 주 신규 ${d26n((wk[wk.length - 1] || {}).join || 0)}명` })}
    ${V4.kpi({ l: t('learner'), icon: 'users', v: d26n(k.lrn), u: '명', spark: wk.length > 1 ? wk.map(w => +w.join || 0) : null, sub: `수강 등록 ${d26n(enr)}건` })}
    ${V4.kpi({ l: '평균 수료율', icon: 'chart', v: String(k.rate), u: '%', tone: k.rate && k.rate < 30 ? 'warn' : '', spark: wk.length > 1 ? wk.map(w => +w.badge || 0) : null, sub: `수료 ${d26n(dn)}건 · ${esc(t('cls'))} ${d26n(k.cls)}개` })}
    ${typeof mbPayOn === 'function' && !mbPayOn() ? V4.kpi({ l: '콘텐츠', icon: 'grid', v: d26n(k.lib), u: '개', sub: '영상 · 자료 · 과제 · 평가' }) : V4.kpi({ l: '이번 달 결제', icon: 'wallet', v: d26n(sum), u: '원', spark: pw, sub: '최근 6주 주간 결제 추이' })}</div>`;
  const area = wk.length > 1 ? `<section class="v4-card d43-area" aria-labelledby="d43a"><div class="v4-ch"><h3 id="d43a">주간 신규 가입</h3><span class="v4-alg"><span><i></i>신규 가입</span>${bdOn ? '<span><i class="p"></i>배지 발급</span>' : ''}</span></div>
    ${V4.area(wk.map(w => +w.join || 0), { prev: bdOn ? wk.map(w => +w.badge || 0) : null, prevL: '배지', labels: wk.map(w => String(w.w || w.label || '').slice(-5)), h: 200, fmt: v => d26n(v) + '명', yfmt: v => d26n(v), tipL: i => `${String(wk[i].w || wk[i].label || '').slice(-5)} 주`, aria: '주간 신규 가입 추이' })}</section>`
    : `<section class="v4-card d43-area">${V4.empty({ art: 'chart', t: '가입 추이는 첫 주가 지나면 그려집니다', d: '초대 링크를 공유해 첫 학습자를 모아 보세요.', act: 'go', v: 'enroll', l: '초대 링크 만들기' })}</section>`;
  const kt = Object.entries(k.kinds); const PAL = ['var(--c-data)', 'var(--gr300)', 'var(--gr800)', 'var(--c-warn)', 'var(--c-prev)']; const kc = { 영상: PAL[0], 자료: PAL[1], 과제: PAL[2], 평가: PAL[3], 설문: PAL[4] };
  const parts = kt.map(([n, v]) => ({ l: n, v, c: kc[n] || PAL[4] }));
  const donut = `<section class="v4-card d43-dn" aria-labelledby="d43d"><div class="v4-ch"><h3 id="d43d">콘텐츠 구성</h3><button class="btn sm ghost" data-act="go" data-v="lib">자료실 ›</button></div>${k.lib ? `<div class="v4-dw">${V4.donut(parts, { size: 132, w: 16, center: `<div><b>${d26n(k.lib)}</b><small>개</small></div>` })}${V4.legend(parts, v => d26n(v) + '개')}</div>` : V4.empty({ art: 'start', t: '아직 콘텐츠가 없습니다', act: 'go', v: 'lib', l: '자료 올리기' })}</section>`;
  const fun = `<section class="v4-card d43-fun" aria-labelledby="d43f"><div class="v4-ch"><h3 id="d43f">학습 전환</h3><span class="v4-cap">회원에서 수료까지 · 오른쪽은 앞 단계 대비</span></div>${V4.funnel([{ l: '회원', s: '가입 완료', v: k.mem }, { l: t('learner'), s: '1개 이상 수강', v: k.lrn }, { l: '진도 50% 이상', s: '1개 이상 강좌', v: half }, { l: '수료', s: '1개 이상 수료', v: dnU }], { u: '' })}</section>`;
  return `<div class="d43">${kpis}<div class="d43-r">${area}${donut}</div>${fun}</div>`; }
{ const base = VIEWS.dash; VIEWS.dash = () => { let old = ''; try { old = base(); } catch (e) { console.error(e); }
  try { const now = new Date(); const ts = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const body = old.replace(/^[\s\S]*?<\/div><\/div>/, m => /class="ph"/.test(m) ? '' : m); /* 기존 머리 제거, 본문만 '활동 현황' 탭에 */
    let d = null, top = '', hl = ''; try { d = d43Data(); hl = d43Head(d); top = d43Top(d); } catch (e) { console.error('d43', e); }
    let main = d26Main(body); if (top) main = main.replace(/<section class="card d26-kpi">[\s\S]*?(?=<section class="card d26-tabs">)/, window.DASHX ? '' : top); /* v43 R6: 「지금 볼 숫자」 4칸(dashx)과 겹치는 KPI 4칸 줄은 뺌 — KPI 8칸 2줄 → 4칸 1줄 */
    return head('홈페이지 대시보드', `수집 기준 시각 ${ts} · 운영 현황을 한눈에 봅니다.`, `<button class="btn pri" data-act="d26-xls">${ic('download', 15)} 운영 현황 엑셀로 내려받기</button>`) + (hl ? `<div class="d43h">${hl}</div>` : '') + `<div class="d26">${d26Left()}${main}</div>`;
  } catch (e) { console.error(e); return old; } }; }
ACT['d26-tab'] = el => { UI.d26t = el.dataset.v; render(); };
ACT['d26-sort'] = el => { UI.d26s = el.value; render(); };
ACT['d26-day'] = el => { UI.d26d = el.dataset.v; render(); };
ACT['d26-mon'] = el => { const v = +el.dataset.v; if (!v) { UI.d26m = today(); UI.d26d = today(); } else { const d = new Date(UI.d26m || today()); d.setDate(1); d.setMonth(d.getMonth() + v); UI.d26m = ymdL(d); } render(); };
ACT['d26-xls'] = () => { const k = d26Kpi(); const rows = [['구분', '값'], [t('cls') + ' 수', k.cls], ['수강 가능 ' + t('cls'), k.open], ['전체 평균 수료율(%)', k.rate], ['콘텐츠', k.lib], ['회원', k.mem], [t('learner'), k.lrn], [], [t('cls') + '명', '수강 인원', '평균 진도(%)', '수료']].concat((S.classes || []).map(c => [c.name, (c.learners || []).length, d26Avg(c), d26Done(c)]));
  const csv = '﻿' + rows.map(r => r.map(v => csvSafe(v)).join(',') /* v25 수식 주입(=, +, -, @) 방지 */).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${S.org.name}_운영현황_${today()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('운영 현황을 내려받았습니다(엑셀에서 열 수 있는 CSV).', 'ok'); };

/* v47 홈 요금제 카드(대표님 지시 2026-11-25 「AI 토큰 부분 보여야 되고, 필요 시나리오도」) — 요금제 이름은 plan.js(PLAN.info)와 같은 출처, 운영자 화면이라 합니다체.
   행: 회원 수(요금제 인원 구간) · 이번 달 메시지 · AI 토큰(월 포함량 막대 · 충전 잔액 토큰/원 · 가장 빠른 만료일) · 콘텐츠
   AI 값: 운영 = GET /api/ai/usage(설정 › AI 사용량과 같은 응답), 시연판 = AIUSE 예시 값. 서버 오류 · AI 미연결은 명확한 문구로. */
D26.ai = { d: null, err: null, at: 0, busy: false };
function d26AiLoad(force) { const A = D26.ai; if (A.busy || (!force && A.at && Date.now() - A.at < 120e3)) return; A.busy = true;
  api('GET', '/api/ai/usage').then(r => { A.d = r; A.err = null; }).catch(e => { A.err = window.errMsg ? window.errMsg(e) : (e && e.message) || '불러오지 못했습니다.'; })
    .finally(() => { A.busy = false; A.at = Date.now(); try { if (CUR.tab === 'home' || document.querySelector('.d26-plan')) render(); } catch (e) { } }); }
function d26Ai() { const lv = typeof LIVE !== 'undefined' && LIVE && LIVE.user;
  if (!lv) { try { const d = window.AIUSE && AIUSE.data(); if (d) return { d, demo: true }; } catch (e) { } return { none: true }; }
  if (LIVE.cfg && !LIVE.cfg.ai) return { off: true };
  d26AiLoad(); const A = D26.ai; if (A.d) return { d: A.d, stale: !!A.err }; if (A.err) return { err: A.err }; return { loading: true }; }
function d26PlanCard(L, msg, msgCap) {
  const P = window.PLAN; const I = P ? P.info() : { legacy: true, tier: 'enterprise', name: 'Enterprise' }; const role = (S.me && S.me.role) || ''; const own = role === 'owner', staff = own || role === 'sub';
  const n = d26n; const tkn = v => { v = +v || 0; return v >= 1e8 ? `${Math.round(v / 1e6) / 100}억` : v >= 1e4 ? `${n(Math.round(v / 1e4))}만` : n(v); };
  const meter = (p, k) => `<span class="d26-meter d26m-${k || 'ok'}"><i style="width:${Math.max(0, Math.min(100, Math.round(p)))}%"></i></span>`;
  const alert = (k, t, btn) => `<div class="d26-al d26-al-${k}" role="${k === 'bad' ? 'alert' : 'status'}"><span>${t}</span>${btn || ''}</div>`;
  const btn = (label, act, v, pri) => `<button type="button" class="btn sm ${pri ? 'pri' : ''}" data-act="${act}"${v != null ? ` data-v="${esc(v)}"` : ''}>${esc(label)}</button>`;
  const ent = !I.legacy && I.tier === 'enterprise';
  /* 머리: 요금제 이름(합니다체) */
  const title = I.legacy ? '기존 계약(전체 기능)을 이용 중입니다.' : I.trial ? (I.expired ? `체험이 끝나 ${P.name('standard')} 기능만 이용 중입니다.` : `${P.name('pro')} 체험을 이용 중입니다.`) : `${esc(I.name)} 요금제를 이용 중입니다.`;
  const sub = I.legacy ? '요금제 도입 전 계약 기관입니다. 지금 쓰는 기능을 그대로 씁니다.' : I.trial ? (I.expired ? `체험 기간이 ${esc(I.end)}에 끝났습니다. 계속 쓰려면 요금제를 계약해 주십시오.` : `체험 기간이 <b>${n(I.daysLeft)}일</b> 남았습니다(${esc(I.end)} 종료).`) : `${esc(I.code)}${P.fee(I.code) ? ' · ' + esc(P.fee(I.code).seg) : ''}${I.renew ? ` · 다음 갱신 ${esc(I.renew)}` : ''}`;
  const al = [];
  if (I.trial && !I.expired && I.daysLeft <= 3) al.push(alert('warn', `체험 종료까지 ${n(I.daysLeft)}일 남았습니다. 종료 후에는 ${P.name('standard')} 기능만 남습니다.`));
  if (I.trial && I.expired) al.push(alert('warn', `Pro 기능(학습 루프 · 채점 초안 · 결제 연동 등)이 잠겼습니다.`));
  /* 회원 수(요금제 인원 구간) · 메시지 한도 */
  const f = P && !I.legacy && !I.trial ? P.fee(I.code) : null; const cap = f && !f.nego ? f.cap : 0;
  const lp = cap ? L / cap * 100 : 0, mp = msgCap ? msg / msgCap * 100 : 0;
  if (cap && lp >= 90) al.push(alert(lp >= 100 ? 'bad' : 'warn', lp >= 100 ? `회원 수가 요금제 인원(${n(cap)}명)을 넘었습니다. 인원 구간 조정이 필요합니다.` : `회원 수가 요금제 인원의 ${Math.floor(lp)}%입니다. 인원 구간을 넘으면 100명 단위로 더하거나 상위 구간으로 바꿉니다.`));
  if (msgCap && mp >= 90) al.push(alert(mp >= 100 ? 'bad' : 'warn', mp >= 100 ? `이번 달 메시지 한도(${n(msgCap)}건)를 모두 썼습니다.` : `이번 달 메시지 한도의 ${Math.floor(mp)}%를 썼습니다.`));
  /* AI 토큰 */
  const X = d26Ai(); let ai = '';
  const reqBtn = own ? btn('충전하기', 'aiu-open', null, 1) : staff || role === 'teacher' ? btn('정운영자에게 요청', 'd26-aireq') : '';
  if (X.off) ai = alert('info', 'AI가 아직 연결되지 않아 AI 기능을 쓸 수 없습니다. 산타에 연결을 요청해 주십시오.', staff ? btn('산타에 문의', 'pl-ask', 'AI 연결') : '');
  else if (X.err) ai = alert('info', `AI 사용량을 불러오지 못했습니다. ${esc(X.err)}`, btn('다시 시도', 'd26-aire'));
  else if (X.loading) ai = '<small class="d26-aiw">AI 사용량을 불러오는 중입니다.</small>';
  else if (X.none) ai = '';
  else { const d = X.d; const tEnd = !!(I.trial && I.expired); /* 체험 종료 · 유료 전환 전 → 월 포함량 0(충전분만) */ const used = +d.used || 0, inc = tEnd ? 0 : +d.included || 0; const cl = tEnd ? Math.max(0, (+d.credit || 0) - used) : +d.creditLeft || 0; const pr = (d.price && d.price.perM) || (window.PLAN_TABLE && PLAN_TABLE.ai.perM) || 20000;
    const cr = (d.credits || []).filter(c => (+c.left || 0) > 0 && c.expires).map(c => c.expires).sort(); const exp = cr[0] || '';
    const ip = inc ? used / inc * 100 : tEnd ? 100 : 0;
    if (d.state === 'off') ai = `<small>AI 토큰(이번 달) <em>${tkn(used)} 사용 · 월 한도 없음</em></small>${meter(0)}<p class="mini d26-ain">${ent || I.legacy ? '월 포함량은 계약에 따라 산타가 넣습니다.' : '월 포함량이 아직 정해지지 않아 사용량만 기록합니다.'}</p>`;
    else {
      ai = `<small>AI 토큰 · 이번 달 포함량 <em>${tkn(Math.min(used, inc))}/${tkn(inc)}</em></small>${meter(ip, ip >= 100 ? 'bad' : ip >= 80 ? 'warn' : 'ok')}
        <small>충전 잔액 <em>${cl ? `${tkn(cl)} 토큰 · 약 ${n(Math.round(cl * pr / 1e6))}원` : '없음'}</em></small>${cl && exp ? `<small>가장 빠른 만료일 <em>${esc(exp)}</em></small>` : ''}`;
      if (tEnd) ai += alert(cl ? 'warn' : 'bad', `체험이 끝나 월 AI 포함량이 0입니다. ${cl ? '충전분만 차감합니다.' : 'AI 기능이 멈췄습니다.'} 충전하거나 유료 요금제로 전환하면 ${cl ? '계속' : '다시'} 쓸 수 있습니다.`, cl ? '' : reqBtn);
      else if (d.state === 'over' || (ip >= 100 && !cl)) ai += alert('bad', `이번 달 포함량${(d.credits || []).length ? '과 충전분' : ''}을 모두 써서 AI 기능이 멈췄습니다. ${own ? '충전하면 바로 다시 쓸 수 있습니다.' : '정운영자가 충전하면 바로 다시 쓸 수 있습니다.'}`, reqBtn);
      else if (ip >= 100) ai += alert('info', `이번 달 포함량을 모두 써서 충전분에서 차감 중입니다(만료일이 빠른 충전분부터).`);
      else if (ip >= 80) ai += alert('warn', `이번 달 AI 포함량의 ${Math.floor(ip)}%를 썼습니다. ${cl ? '포함량을 넘으면 충전분에서 차감합니다.' : '충전분이 없어 포함량을 넘으면 AI 기능이 멈춥니다.'}`, !cl ? reqBtn : '');
      if (ent) ai += '<p class="mini d26-ain">월 포함량은 계약에 따라 산타가 넣습니다.</p>';
    }
    if (X.stale) ai += '<p class="mini d26-ain">최신 값을 불러오지 못해 마지막으로 받은 값을 보여 줍니다.</p>';
    if (own && (S.aiReq || []).length) ai += alert('info', `AI 충전 요청 ${n(S.aiReq.length)}건 — ${esc(S.aiReq[S.aiReq.length - 1].name || '')}(${esc(S.aiReq[S.aiReq.length - 1].at || '')})`, btn('요청 확인', 'd26-aireqok'));
  }
  const acts = staff ? `<div class="d26-pacts">${btn('요금 안내', 'pl-open', 'guide')}${own ? btn('충전', 'aiu-open') : btn('AI 사용량', 'aiu-open')}${btn(ent || I.legacy ? '산타에 문의' : '업그레이드 문의', 'pl-ask', ent || I.legacy ? '요금제 · 포함량 문의' : '요금제 업그레이드')}</div>` : '';
  return `<div class="card d26-plan" data-d26-plan="${esc(I.legacy ? 'legacy' : I.trial ? 'trial' : I.tier)}"><small class="d26-cap">요금제${X.demo ? ' <span class="d26-demo">시연판 예시 값</span>' : ''}</small><div class="ch"><b>${title}</b></div><p class="mini d26-psub">${sub}</p>${al.join('')}
      <div class="d26-use"><small>회원 수 <em>${n(L)}${cap ? '/' + n(cap) : ''}명</em></small>${meter(cap ? lp : 0, lp >= 100 ? 'bad' : lp >= 90 ? 'warn' : 'ok')}<small>이번 달 메시지 <em>${n(msg)}${msgCap ? '/' + n(msgCap) : ''}건</em></small>${meter(mp, mp >= 100 ? 'bad' : mp >= 90 ? 'warn' : 'ok')}${ai}<small>콘텐츠 <em>${n((S.lib || []).length)}개</em></small></div>${acts}</div>`;
}
ACT['d26-aire'] = () => d26AiLoad(true);
ACT['d26-aireq'] = () => { const nm = (S.me && (S.me.name || S.me.email)) || '운영자'; S.aiReq = [...(S.aiReq || []), { at: today(), name: nm }].slice(-20);
  if (typeof logAudit === 'function') logAudit('AI 충전 요청(정운영자에게)'); save(); toast('정운영자에게 AI 충전 요청을 남겼습니다. 정운영자 홈 요금제 카드에 표시됩니다.', 'ok'); render(); };
ACT['d26-aireqok'] = () => { if (S.me.role !== 'owner') return; S.aiReq = []; save(); render(); };
(() => { if (typeof document === 'undefined' || document.getElementById('d26plCss')) return; const st = document.createElement('style'); st.id = 'd26plCss';
  st.textContent = `.d26-plan .ch b{word-break:keep-all}.d26-psub{margin:4px 0 8px;color:var(--g700)}.d26-psub b{color:var(--g900)}.d26-demo{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:99px;background:var(--g100,#f1f3f5);color:var(--g700);font-size:11px;font-weight:600}
.d26-al{display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:space-between;margin:0 0 10px;padding:8px 10px;border-radius:8px;font-size:12.5px;line-height:1.5;background:var(--g100,#f1f3f5);color:var(--g800)}.d26-al span{flex:1 1 160px;min-width:0}
.d26-al-warn{background:#FFF6E0;color:#6B4A00}.d26-al-bad{background:#FDECEC;color:#8A1C1C}.d26-m-warn i,.d26m-warn i{background:#E8A200 !important}.d26m-bad i{background:#D93636 !important}
.d26-ain{margin:-6px 0 10px}.d26-aiw{display:block;color:var(--g700);font-size:12.5px;margin-bottom:10px}.d26-pacts{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}.d26-pacts .btn{flex:1 1 auto}`; document.head.appendChild(st); })();
