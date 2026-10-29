/* 디디쌤 스튜디오 v2 — KIT AX ON 어드민에서 가져온 기능
   현황(목표선 KPI · 퍼널 · 추이) · 평가(통과/재제출/미통과) · 배지(자동 3방식 · 수동 · 해제 · 특별 · 대장 · 메달)
   러닝 저니 · AI 진단 · 콘텐츠 편성 · 진도 기준 · AI 튜터 · 공지/알림함 · 등록(학번 · 접근코드) · 메뉴 구성 */
'use strict';
const orgShort = () => (S.org.name.replace(/\s|학교$|대학교$/g, '').slice(0, 4) || 'AX').toUpperCase();
function medal(b, w = 56) {
  return `<svg viewBox="0 0 120 140" width="${w}" height="${Math.round(w * 140 / 120)}" aria-hidden="true" class="medal"><path d="M40 92 L30 134 L46 126 L56 138 L62 100Z" fill="${esc(b.rib)}"/><path d="M80 92 L90 134 L74 126 L64 138 L58 100Z" fill="${esc(b.rib)}"/><polygon points="60,4 108,31 108,87 60,114 12,87 12,31" fill="${esc(b.fill)}" stroke="${esc(b.ring)}" stroke-width="6" stroke-linejoin="round"/><polygon points="60,20 94,39.5 94,78.5 60,98 26,78.5 26,39.5" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/><text x="60" y="47" text-anchor="middle" font-size="8.5" font-weight="700" letter-spacing="1.2" fill="#fff" font-family="Space Grotesk,sans-serif">${esc(orgShort())}</text><text x="60" y="80" text-anchor="middle" font-size="32" font-weight="700" fill="#fff" font-family="Space Grotesk,sans-serif">${esc(b.key)}</text><text x="60" y="93" text-anchor="middle" font-size="7.5" font-weight="700" letter-spacing="1" fill="#fff" font-family="Space Grotesk,sans-serif">${esc(String(b.name).toUpperCase().slice(0, 12))}</text></svg>`;
}
/* 선 차트(SVG, 라이브러리 없음) */
function lineChart(labels, series, h = 200) {
  const W = 560, P = 34, max = Math.max(1, ...series.flatMap(s => s.v)) * 1.15; const x = i => P + i * (W - P - 30) / Math.max(1, labels.length - 1), y = v => h - 24 - v / max * (h - 44);
  const grid = [0, .5, 1].map(f => `<line x1="${P}" x2="${W - 30}" y1="${y(max * f / 1.15)}" y2="${y(max * f / 1.15)}" class="gl"/><text x="${P - 6}" y="${y(max * f / 1.15) + 4}" text-anchor="end" class="gt">${Math.round(max * f / 1.15)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${h}" class="chart" role="img" aria-label="${esc(series.map(s => s.n).join(' · '))} 추이">${grid}${labels.map((l, i) => `<text x="${x(i)}" y="${h - 6}" text-anchor="middle" class="gt">${esc(l)}</text>`).join('')}${series.map(s => `<polyline fill="none" stroke="${s.c}" stroke-width="2.4" points="${s.v.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>${s.v.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${i === s.v.length - 1 ? 4 : 2.5}" fill="${s.c}"><title>${esc(labels[i])} ${esc(s.n)} ${v}</title></circle>`).join('')}`).join('')}</svg>
  <div class="legend">${series.map(s => `<span><i style="background:${s.c}"></i>${esc(s.n)}</span>`).join('')}</div>`;
}
const funnel = rows => { const m = Math.max(1, ...rows.map(r => r[1])); return `<div class="funnel">${rows.map(([l, v]) => `<div class="fr"><span>${esc(l)}</span><i><b style="width:${v / m * 100}%"></b></i><em>${num(v)}</em></div>`).join('')}</div>`; };
const hasBadge = id => S.badges.some(b => b.issued.some(i => i.who === id && i.st === '유효'));

/* ═════════ 현황 ═════════ */
VIEWS.dash = () => {
  const L = S.members, n = L.length, G = S.settings.goals;
  const joined = L.filter(m => m.grade === '정회원').length, act7 = L.filter(m => daysAgo(m.last) <= 7).length, away14 = L.filter(m => daysAgo(m.last) >= 14).length;
  const allP = S.classes.flatMap(c => Object.values(c.prog).map(p => p.p)); const avg = avgOf(allP);
  const withB = L.filter(m => hasBadge(m.id)).length; const P = pend(); const oldest = P.length ? Math.max(...P.map(x => daysAgo(x.c.prog[x.id].subAt))) : 0;
  const diagDone = L.filter(m => m.diag).length; const isU = S.org.type === 'univ';
  const started = L.filter(m => S.classes.some(c => c.prog[m.id]?.p > 0)).length, submitted = L.filter(m => S.classes.some(c => ['submitted', 'graded', 'returned'].includes(c.prog[m.id]?.assign))).length, done = L.filter(m => S.classes.some(c => c.prog[m.id]?.p >= c.criteria.threshold)).length;
  const gap = (v, g) => v >= g ? `<span class="okt">목표 ${g}% 달성</span>` : `<span class="wt">목표까지 ${Math.round(g - v)}%p · 목표 ${g}%</span>`;
  const jr = joined / n * 100, ar = act7 / Math.max(1, joined) * 100, br = withB / Math.max(1, joined) * 100;
  return `<div class="ph"><div class="phl"><p>${tag('데모 데이터', 'y')} ${esc(TYPES[S.org.type].name)} · ${today()}</p></div><div class="phr"><button class="btn" data-act="kpi-csv">KPI 보고서 CSV</button><button class="btn ink" data-act="chat-q" data-v="주간 보고서 만들어 줘">${ic('spark', 16)} 주간 보고서</button></div></div>
  <section class="kpis">
    ${kpi('등록 ' + t('learner'), num(n), `정회원 ${joined} · 준회원 ${L.filter(m => m.grade === '준회원').length} · 대기 ${L.filter(m => m.grade === '승인 대기').length}`, '', '명')}
    ${kpi('가입(활성화)율', Math.round(jr), gap(jr, G.join), '', '%', { v: jr, goal: G.join })}
    ${kpi('주간 활성', num(act7), `최근 7일 접속 · 가입자의 ${pct(ar)}`, '', '명')}
    ${isU ? kpi('AI 진단 완료율', Math.round(diagDone / n * 100), `${diagDone}명 완료`, '', '%') : kpi(t('done') + ' 인원', num(done), `수료 기준 충족`, '', '명')}
    ${kpi('평균 진도율', Math.round(avg), gap(avg, G.progress), '', '%', { v: avg, goal: G.progress })}
    ${kpi('배지 보유율', Math.round(br), gap(br, G.badge), '', '%', { v: br, goal: G.badge })}
    ${kpi('검수 대기', P.length, P.length ? `가장 오래된 제출 ${oldest}일 전` : '대기 없음', P.length ? 'mg' : '', '건')}
    ${kpi('14일 이상 미접속', away14, `<a href="#" data-act="chat-q" data-v="14일 미접속 ${esc(t('learner'))}에게 독려 메시지 보내줘">AI로 독려하기</a>`, '', '명')}
  </section>
  <section class="g2c">
    <div class="card"><div class="ch"><b>주차별 신규 가입 · 배지 발급</b><small>최근 8주 · 단위: 명</small></div>${lineChart(S.weeks.map(w => w.w), [{ n: '신규 가입', c: '#4C77C5', v: S.weeks.map(w => w.join) }, { n: '배지 발급', c: '#D6246E', v: S.weeks.map(w => w.badge) }])}</div>
    <div class="card"><div class="ch"><b>학습 퍼널</b><small>등록 대비 각 단계 도달 인원</small></div>${funnel([['등록', n], ['가입(활성화)', joined], ...(isU ? [['AI 진단 완료', diagDone]] : []), ['학습 시작', started], ['과제 제출', submitted], [t('done'), done], ['배지 보유', withB]])}</div>
  </section>
  <section class="g2c">
    <div class="card"><div class="ch"><b>${esc(t('group'))}별 현황</b><small>가입률 낮은 순</small></div>${table([t('group'), '인원', '가입률', '평균 진도', t('done')], S.groups.map(g => { const ms = L.filter(m => m.group === g.id); const j = ms.filter(m => m.grade === '정회원').length / Math.max(1, ms.length) * 100; const ps = S.classes.flatMap(c => ms.filter(m => c.prog[m.id]).map(m => c.prog[m.id].p)); return { g, ms, j, p: avgOf(ps), d: ms.filter(m => S.classes.some(c => c.prog[m.id]?.p >= c.criteria.threshold)).length }; }).sort((a, b) => a.j - b.j).map(r => [`<b>${esc(r.g.name)}</b>`, r.ms.length, `${bar(r.j)} ${pct(r.j)}`, pct(r.p), r.d + '명']))}</div>
    <div class="card">${isU ? `<div class="ch"><b>AI 진단 유형 분포</b><small>진단 완료 ${diagDone}명</small></div>${prismBars()}` : `<div class="ch"><b>${esc(t('cls'))} Top 5</b><small>수강 인원순</small></div>${[...S.classes].sort((a, b) => b.learners.length - a.learners.length).slice(0, 5).map((c, i) => `<div class="row"><span><b class="rk">${i + 1}</b>${esc(c.name)}</span><span>${c.learners.length}명 · ${pct(avgP(c))}</span></div>`).join('')}`}</div>
  </section>`;
};
const PRISM = { EYE: ['#E63295', '관찰형'], PEN: ['#4C77C5', '기록형'], LENS: ['#E8622A', '분석형'], STORY: ['#7D5CB5', '표현형'], MAP: ['#3BA875', '설계형'] };
function prismBars() { const c = {}; S.members.forEach(m => m.diag && (c[m.diag] = (c[m.diag] || 0) + 1)); const tot = Object.values(c).reduce((a, b) => a + b, 0) || 1; return `<div class="funnel">${Object.entries(PRISM).map(([k, [col, l]]) => `<div class="fr"><span>${k} <small>${l}</small></span><i><b style="width:${(c[k] || 0) / tot * 100}%;background:${col}"></b></i><em>${c[k] || 0}</em></div>`).join('')}</div>`; }
ACT['kpi-csv'] = () => { const L = S.members; downloadCSV(`KPI_${today()}.csv`, ['지표', '값'], [['등록', L.length], ['가입률(%)', Math.round(L.filter(m => m.grade === '정회원').length / L.length * 100)], ['주간 활성', L.filter(m => daysAgo(m.last) <= 7).length], ['평균 진도(%)', Math.round(avgOf(S.classes.flatMap(c => Object.values(c.prog).map(p => p.p))))], ['배지 보유', L.filter(m => hasBadge(m.id)).length], ['검수 대기', pend().length], ['14일 미접속', L.filter(m => daysAgo(m.last) >= 14).length]]); };

/* ═════════ 평가 (통과 / 재제출 / 미통과) ═════════ */
VIEWS.assess = () => {
  const f = UI.asF || 'wait'; const P = pend().sort((a, b) => a.c.prog[a.id].subAt.localeCompare(b.c.prog[b.id].subAt));
  const D = S.classes.flatMap(c => Object.entries(c.prog).filter(([, p]) => ['graded', 'returned', 'failed'].includes(p.assign)).map(([id, p]) => ({ c, id, p })));
  const waits = P.map(x => daysAgo(x.c.prog[x.id].subAt));
  return head('', `오래 기다린 제출부터 루브릭으로 채점하고 통과 · 재제출 · 미통과를 정합니다. 통과하면 연결된 배지가 자동 발급됩니다.`, P.length ? `<button class="btn ink" data-act="ai-grade-all">${ic('spark', 16)} 대기 ${P.length}건 AI 채점 초안</button>` : '') +
    `<section class="kpis k3">${kpi('검수 대기', P.length, '', P.length ? 'mg' : '', '건')}${kpi('가장 오래된 대기', waits.length ? Math.max(...waits) : 0, '제출 후 경과', '', '일')}${kpi('평균 대기', waits.length ? Math.round(avgOf(waits) * 10) / 10 : 0, '처리 목표 3일 이내', '', '일')}</section>` +
    tabs('asF', [['wait', `검수 대기 ${P.length}`], ['done', `처리 완료 ${D.length}`]], f) +
    (f === 'wait' ? table(['제출일', '대기', '이름', t('group'), t('cls'), 'AI 초안', ''], P.map(({ c, id }) => { const p = c.prog[id], w = daysAgo(p.subAt); return [p.subAt.slice(5), w >= 5 ? tag(w + '일', 'r') : w + '일', mn(id), gn(M(id)?.group), esc(c.name), p.draft ? `<b>${p.draft.score}</b>점 · ${esc(p.draft.note)}` : '—', `<button class="btn sm ink" data-act="grade" data-c="${c.id}" data-v="${id}">채점</button>`]; }), '검수할 제출물이 없습니다.')
      : table(['이름', t('cls'), '점수', '결과', '피드백'], D.map(({ c, id, p }) => [mn(id), esc(c.name), p.score ?? '—', p.assign === 'graded' ? tag('통과', 'g') : p.assign === 'returned' ? tag('재제출', 'y') : tag('미통과', 'r'), esc((p.fb || '').slice(0, 40))])));
};
const RUBRIC = [['요구사항 충족', 40], ['정확성', 30], ['완성도', 20], ['형식', 10]];
ACT.grade = el => {
  const c = C(el.dataset.c), id = el.dataset.v, p = c.prog[id]; const d = p.draft || AI.gradeDraft(c, id); const ratio = d.score / 100;
  modal(`채점 — ${M(id).name} · ${c.name}`, `<div class="aibox">${ic('spark', 16)} <b>AI 채점 초안 ${d.score}점</b> · ${esc(d.note)}</div>
    <div class="rub">${RUBRIC.map(([n, mx], i) => `<label>${esc(n)} <small>/${mx}</small><input type="number" name="r${i}" min="0" max="${mx}" value="${Math.round(mx * ratio)}"></label>`).join('')}</div>
    <label class="fl">피드백<textarea name="f" rows="3">${esc(d.feedback)}</textarea></label>
    <p class="mini">통과 점수 ${c.criteria.threshold >= 100 ? 70 : 70}점 · 재제출 허용 ${S.settings.progress.resubmit}회. AI 초안은 참고용이며 최종 판정은 운영자가 합니다.</p>`,
    [{ id: 'c', label: '취소' }, { id: 'fail', label: '미통과', kind: 'red', run: w => fin(w, 'failed') }, { id: 'ret', label: '재제출 요청', run: w => fin(w, 'returned') }, { id: 'ok', label: '통과', kind: 'pri', run: w => fin(w, 'graded') }], true);
  function fin(w, st) {
    p.score = RUBRIC.reduce((a, [, mx], i) => a + clamp(+fv(w, 'r' + i) || 0, 0, mx), 0); p.fb = fv(w, 'f'); p.assign = st; delete p.draft;
    if (st === 'returned' && !p.fb) { toast('재제출 요청에는 피드백이 필요합니다.', 'warn'); p.assign = 'submitted'; return false; }
    let msg = `${M(id).name} — ${{ graded: '통과', returned: '재제출 요청', failed: '미통과' }[st]} (${p.score}점)`;
    if (st === 'graded') { const b = S.badges.find(b => b.cls === c.id && b.method === 'pass' && !b.special); if (b && !b.issued.some(i => i.who === id && i.st === '유효')) { b.issued.unshift({ who: id, at: today(), no: `${b.key}-${String(b.issued.length + 1).padStart(4, '0')}`, how: '자동', st: '유효', reason: '평가 통과' }); msg += ` · 「${b.name}」 배지 자동 발급`; } }
    logAudit('평가 — ' + msg); save(); render(); toast(msg, 'ok');
  }
};

/* ═════════ 배지 ═════════ */
const METHOD = { pass: '평가 통과 시 자동', submit: '제출 즉시 자동', manual: '수동 발급' };
VIEWS.badge = () => {
  const tb = UI.bdT || 'ledger';
  const all = S.badges.flatMap(b => b.issued.map(i => ({ b, ...i })));
  const fb = UI.bdB || '', fs = UI.bdS || '';
  const rows = all.filter(x => (!fb || x.b.id === fb) && (!fs || x.st === fs)).sort((a, b) => b.at.localeCompare(a.at));
  let body = '';
  if (tb === 'ledger') body = `<div class="bar2"><select data-chg="bdB" aria-label="배지"><option value="">전체 배지</option>${S.badges.map(b => `<option value="${b.id}" ${fb === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select><select data-chg="bdS" aria-label="상태"><option value="">전체 상태</option><option ${fs === '유효' ? 'selected' : ''}>유효</option><option ${fs === '해제' ? 'selected' : ''}>해제</option></select><button class="btn" data-act="bd-csv">발급 대장 CSV</button></div>` +
    table([S.org.type === 'univ' ? '학번' : '이름', t('group'), '배지', '발급 번호', '발급일', '방식', '상태', ''], rows.slice(0, 60).map(x => [S.org.type === 'univ' ? esc(M(x.who)?.extra?.학번 || '') + ' ' + mn(x.who) : mn(x.who), gn(M(x.who)?.group), esc(x.b.name), `<code>${esc(orgShort())}-${esc(x.no)}</code>`, x.at, esc(x.how), x.st === '유효' ? tag('유효', 'g') : tag('해제', 'r'), x.st === '유효' ? `<button class="btn sm redl" data-act="bd-rev" data-b="${x.b.id}" data-v="${esc(x.no)}">해제</button>` : `<small>${esc(x.reason)}</small>`]), '발급 내역이 없습니다.');
  if (tb === 'manual') body = `<div class="card form1"><label class="fl">배지<select id="bmB">${S.badges.map(b => `<option value="${b.id}">${esc(b.name)}${b.special ? ' (특별)' : ''}</option>`).join('')}</select></label>
    <label class="fl">대상 — ${S.org.type === 'univ' ? '학번' : '이름'}을 줄마다 입력하거나 ${esc(t('group'))}을 고르세요<textarea id="bmL" rows="4" placeholder="${S.org.type === 'univ' ? '20261000&#10;20261001' : esc(S.members[0].name)}"></textarea></label>
    <label class="fl">${esc(t('group'))} 전체<select id="bmG"><option value="">— 선택 안 함 —</option>${S.groups.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></label>
    <label class="fl">발급 사유(필수)<input id="bmR" maxlength="60" placeholder="예: 공모전 우수 프로젝트"></label><button class="btn ink" data-act="bd-issue">발급하기</button><p class="mini">같은 배지를 같은 사람에게 중복 발급하지 않습니다. 발급 시 알림이 함께 나갑니다.</p></div>`;
  if (tb === 'set') body = `<div class="bset">${S.badges.map(b => `<div class="card bcard">${medal(b, 64)}<div class="bci"><input value="${esc(b.name)}" maxlength="20" data-chg="bd-name" data-v="${b.id}" aria-label="배지 이름"><select data-chg="bd-method" data-v="${b.id}" aria-label="발급 방식" ${b.special ? 'disabled' : ''}>${Object.entries(METHOD).map(([k, v]) => `<option value="${k}" ${b.method === k ? 'selected' : ''}>${v}</option>`).join('')}</select><select data-chg="bd-cls" data-v="${b.id}" aria-label="연결 ${esc(t('cls'))}" ${b.special ? 'disabled' : ''}><option value="">연결 ${esc(t('cls'))} 없음</option>${S.classes.map(c => `<option value="${c.id}" ${b.cls === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select><small>${b.special ? '특별 배지 · 수동 발급만' : '유효 ' + b.issued.filter(i => i.st === '유효').length + '개'}</small></div></div>`).join('')}
    <button class="card bnew" data-act="bd-new">+ 배지 만들기</button></div><p class="mini">Open Badge 3.0 형식으로 발급합니다. 디디쌤 기본 배지는 수동 발급 · 취소 불가이며, 자동 발급 · 해제 · 특별 배지는 AX 확장 기능입니다.</p>`;
  return head('', '발급 방식(평가 통과 시 자동 · 제출 즉시 자동 · 수동) · 해제 · 특별 배지 · 발급 대장') +
    `<section class="medals">${S.badges.map(b => `<div class="card mcard">${medal(b, 46)}<div><b>${esc(b.name)}</b><strong>${b.issued.filter(i => i.st === '유효').length}<small>개 유효</small></strong><small>${esc(b.special ? '특별 배지' : METHOD[b.method])}</small></div></div>`).join('')}</section>` +
    tabs('bdT', [['ledger', '발급 현황'], ['manual', '수동 발급'], ['set', '배지 생성 · 설정']], tb) + body;
};
ACT.bdB = el => { UI.bdB = el.value; render(); }; ACT.bdS = el => { UI.bdS = el.value; render(); };
ACT['bd-name'] = el => { S.badges.find(b => b.id === el.dataset.v).name = el.value.trim() || '배지'; save(); render(); };
ACT['bd-method'] = el => { S.badges.find(b => b.id === el.dataset.v).method = el.value; save(); toast('발급 방식을 바꿨습니다.', 'ok'); };
ACT['bd-cls'] = el => { S.badges.find(b => b.id === el.dataset.v).cls = el.value; save(); };
ACT['bd-new'] = () => modal('배지 만들기', `<label class="fl">이름<input name="n" maxlength="20"></label><label class="fl">표시 글자(1~2자)<input name="k" maxlength="2" value="${S.badges.length + 1}"></label><label class="fl">색<select name="c"><option value="#4C77C5|#2E4F8F|#B9CCEB">블루</option><option value="#E63295|#B01A59|#F5B5D2">마젠타</option><option value="#3BA875|#23774F|#BFE5CF">그린</option><option value="#E8A317|#A86F00|#F6D58A">골드</option><option value="#15173B|#0C0D24|#D6246E">네이비</option></select></label><label class="ckl"><input type="checkbox" name="sp"> 특별 배지(수동 발급 전용)</label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { if (!fv(w, 'n')) return false; const [f, r, rb] = fv(w, 'c').split('|'); S.badges.push({ id: uid('bd'), name: fv(w, 'n'), key: fv(w, 'k') || '★', cls: '', method: 'manual', special: fv(w, 'sp'), fill: f, ring: r, rib: rb, issued: [] }); save(); render(); } }]);
ACT['bd-issue'] = () => {
  const b = S.badges.find(x => x.id === $('#bmB').value); const reason = $('#bmR').value.trim(); if (!reason) { toast('발급 사유를 입력하세요.', 'warn'); return; }
  const keys = $('#bmL').value.split(/\n|,/).map(s => s.trim()).filter(Boolean); const g = $('#bmG').value;
  const ids = new Set([...S.members.filter(m => keys.includes(m.extra?.학번) || keys.includes(m.name)).map(m => m.id), ...(g ? S.members.filter(m => m.group === g).map(m => m.id) : [])]);
  let n = 0; ids.forEach(id => { if (!b.issued.some(i => i.who === id && i.st === '유효')) { b.issued.unshift({ who: id, at: today(), no: `${b.key}-${String(b.issued.length + 1).padStart(4, '0')}`, how: '수동', st: '유효', reason }); n++; } });
  logAudit(`배지 수동 발급 — ${b.name} ${n}명 (${reason})`); save(); UI.bdT = 'ledger'; render(); toast(`${n}명에게 발급했습니다${ids.size > n ? ` (중복 ${ids.size - n}명 제외)` : ''}.`, 'ok');
};
ACT['bd-rev'] = el => { const b = S.badges.find(x => x.id === el.dataset.b), it = b.issued.find(i => i.no === el.dataset.v); modal('배지 해제', `<p><b>${mn(it.who)}</b> · ${esc(b.name)} (${esc(orgShort())}-${esc(it.no)})</p><label class="fl">해제 사유(필수)<input name="r" maxlength="60"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '해제', kind: 'red', run: w => { if (!fv(w, 'r')) { toast('사유를 입력하세요.', 'warn'); return false; } it.st = '해제'; it.reason = fv(w, 'r'); logAudit(`배지 해제 — ${b.name} ${M(it.who)?.name} (${it.reason})`); save(); render(); } }]); };
ACT['bd-csv'] = () => downloadCSV(`배지_발급대장_${today()}.csv`, ['학번', '이름', t('group'), '배지', '발급번호', '발급일', '방식', '상태', '사유'], S.badges.flatMap(b => b.issued.map(i => [M(i.who)?.extra?.학번 || '', M(i.who)?.name, S.groups.find(g => g.id === M(i.who)?.group)?.name, b.name, `${orgShort()}-${i.no}`, i.at, i.how, i.st, i.reason])));

/* ═════════ 러닝 저니 ═════════ */
VIEWS.journey = () => {
  const J = S.journey; const at = j => S.members.filter(m => { const lv = S.badges.filter(b => b.issued.some(i => i.who === m.id && i.st === '유효') && !b.special).length; return lv === j; }).length;
  return head('', `단계 순서와 열림 조건을 정합니다. ${esc(t('learner'))}은 앞 단계 조건을 채우면 다음 단계가 열립니다.`, `<button class="btn" data-act="jn-add">+ 단계 추가</button>`) +
    `<div class="journey">${J.map((j, i) => `<div class="card jstep"><div class="jh"><span class="jn">STEP ${i + 1}</span><input value="${esc(j.name)}" maxlength="20" data-chg="jn-name" data-v="${i}" aria-label="단계 이름"><span class="sp"></span><button class="btn sm ghost" data-act="jn-mv" data-v="${i}" data-d="-1" aria-label="앞으로">←</button><button class="btn sm ghost" data-act="jn-mv" data-v="${i}" data-d="1" aria-label="뒤로">→</button></div>
      <label class="mini">열림 조건<select data-chg="jn-unlock" data-v="${i}">${['바로 열림', ...J.slice(0, i).map(p => `${p.name} 배지 획득`), ...(i ? [`${J[i - 1].name} ${t('done')}율 80%`] : [])].map(o => `<option ${j.unlock === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>
      <div class="chips2">${j.cls.map(id => `<span class="chip2">${esc(C(id)?.name || '')}<button data-act="jn-rm" data-v="${i}" data-c="${id}" aria-label="빼기">${ic('x', 12)}</button></span>`).join('')}<select data-chg="jn-addc" data-v="${i}" aria-label="${esc(t('cls'))} 추가"><option value="">+ ${esc(t('cls'))}</option>${S.classes.filter(c => !j.cls.includes(c.id)).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
      <div class="jf"><span>${medal(S.badges.find(b => b.id === j.badge) || S.badges[0], 28)} ${esc(S.badges.find(b => b.id === j.badge)?.name || '배지 없음')}</span><b>${at(i)}<small>명이 이 단계</small></b></div></div>`).join('<span class="jarrow">' + ic('arrow') + '</span>')}</div>` +
    (S.org.type === 'univ' ? `<div class="card"><div class="ch"><b>코스 매트릭스</b><small>단계 × AI 진단 유형 = ${J.length * 5}개 코스 · 코스당 튜토리얼 5편</small></div>${table(['단계', ...Object.keys(PRISM)], J.map(j => [`<b>${esc(j.name)}</b>`, ...Object.keys(PRISM).map(k => `<span class="cell"><i style="background:${PRISM[k][0]}"></i>튜토리얼 5</span>`)]))}</div>` : '');
};
ACT['jn-name'] = el => { S.journey[+el.dataset.v].name = el.value.trim() || '단계'; save(); };
ACT['jn-unlock'] = el => { S.journey[+el.dataset.v].unlock = el.value; save(); toast('열림 조건을 바꿨습니다.', 'ok'); };
ACT['jn-addc'] = el => { if (!el.value) return; S.journey[+el.dataset.v].cls.push(el.value); save(); render(); };
ACT['jn-rm'] = el => { const j = S.journey[+el.dataset.v]; j.cls = j.cls.filter(x => x !== el.dataset.c); save(); render(); };
ACT['jn-mv'] = el => { const a = S.journey, i = +el.dataset.v, k = i + +el.dataset.d; if (k < 0 || k >= a.length) return; [a[i], a[k]] = [a[k], a[i]]; save(); render(); };
ACT['jn-add'] = () => { S.journey.push({ id: uid('j'), name: '새 단계', cls: [], unlock: `${S.journey[S.journey.length - 1]?.name || ''} 배지 획득`, badge: '' }); save(); render(); };

/* ═════════ AI 진단 (대학) ═════════ */
VIEWS.diag = () => {
  const L = S.members, d = L.filter(m => m.diag).length;
  return head('', '학과 맞춤 + 랜덤 8문항으로 학습 유형을 진단하고, 유형에 맞는 코스를 추천합니다.', `<button class="btn ink" data-act="chat-q" data-v="AI 진단 안 한 학생에게 안내 보내줘">${ic('spark', 16)} 미완료자 안내</button>`) +
    `<section class="kpis k3">${kpi('진단 완료율', Math.round(d / L.length * 100), `${d}명 완료 · ${L.length - d}명 남음`, '', '%')}${kpi('가장 많은 유형', Object.entries(L.reduce((a, m) => (m.diag && (a[m.diag] = (a[m.diag] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1])[0]?.[0] || '—', '')}${kpi('문항 수', 8, '학과 맞춤 + 랜덤', '', '문항')}</section>
    <section class="g2c"><div class="card"><div class="ch"><b>유형 분포</b></div>${prismBars()}</div>
    <div class="card"><div class="ch"><b>${esc(t('group'))}별 완료율</b></div>${S.groups.map(g => { const ms = L.filter(m => m.group === g.id); const r = ms.filter(m => m.diag).length / Math.max(1, ms.length) * 100; return `<div class="row"><span>${esc(g.name)}</span><span>${bar(r)} ${pct(r)}</span></div>`; }).join('')}</div></section>`;
};

/* ═════════ 콘텐츠 · 편성 ═════════ */
VIEWS.library = () => head('', `영상 · 문서 업로드, YouTube 등록, ${esc(t('cls'))}에 편성. 편성된 콘텐츠는 삭제할 수 없습니다. 영상 1개 최대 2시간 · 4GB ${guideRef('features/library.md')}`, `<button class="btn" data-act="yt-add">YouTube 등록</button><label class="btn ink">업로드<input type="file" multiple hidden data-chg="lib-up" accept="video/*,.pdf,.hwp,.hwpx,.xlsx,.xls,.ppt,.pptx,image/*"></label>`) +
  table(['콘텐츠', '종류', '길이 · 크기', '편성', '조회', '이탈률', ''], S.lib.map(l => [`<b>${esc(l.name)}</b>`, tag(l.kind, l.kind === 'YouTube' ? 'r' : ''), esc(l.size), (l.cls || []).map(id => `<span class="chip2 sm">${esc(C(id)?.name || '')}</span>`).join(' ') || '<small class="mini">미편성</small>', num(l.views || 0), l.kind === '문서' ? '—' : ((l.drop || 0) > 30 ? tag(l.drop + '%', 'y') : (l.drop || 0) + '%'), `<button class="btn sm" data-act="lib-pl" data-v="${l.id}">편성</button><button class="btn sm ghost" data-act="lib-del" data-v="${l.id}">삭제</button>`])) +
  `<p class="mini">데모에서는 파일 이름과 크기만 기록합니다. 실제 운영에서는 저장소 업로드 후 CDN으로 재생합니다.</p>`;
ACT['yt-add'] = () => modal('YouTube 등록', `<label class="fl">YouTube 주소<input name="u" placeholder="https://youtu.be/..."></label><label class="fl">제목<input name="t" maxlength="60"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '등록', kind: 'pri', run: w => { const u = fv(w, 'u'); if (!/^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/.test(u)) { toast('YouTube 주소 형식을 확인하세요.', 'warn'); return false; } S.lib.unshift({ id: uid('l'), name: fv(w, 't') || u, kind: 'YouTube', size: '—', used: 0, cls: [], at: today(), views: 0, drop: 0 }); save(); render(); } }]);
ACT['lib-pl'] = el => { const l = S.lib.find(x => x.id === el.dataset.v); modal(`편성 — ${l.name}`, `<div class="chk">${S.classes.map(c => `<label><input type="checkbox" name="c" value="${c.id}" ${(l.cls || []).includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const nw = $$('[name=c]:checked', w).map(x => x.value); nw.filter(id => !(l.cls || []).includes(id)).forEach(id => C(id).curriculum.push({ id: uid('it'), type: l.kind === '문서' ? 'chapter' : 'video', title: l.name.replace(/\.\w+$/, '') })); l.cls = nw; l.used = nw.length; save(); render(); toast('편성을 저장했습니다.', 'ok'); } }]); };
ACT['lib-del'] = el => { const l = S.lib.find(x => x.id === el.dataset.v); if ((l.cls || []).length) { toast('편성된 콘텐츠는 삭제할 수 없습니다. 먼저 편성을 해제하세요.', 'warn'); return; } S.lib = S.lib.filter(x => x !== l); save(); render(); };

/* ═════════ 진도 · AI 튜터 ═════════ */
VIEWS.progress = () => {
  const p = S.settings.progress, tu = S.settings.tutor; const mx = Math.max(...S.tutorUsage.map(u => u.n), 1);
  const sw = (k, l, o, d) => `<label class="swrow"><span><b>${l}</b><small>${d}</small></span><span class="sw"><input type="checkbox" ${o[k] ? 'checked' : ''} data-chg="${o === p ? 'pg' : 'tu'}" data-k="${k}"><span></span></span></label>`;
  return head('', '진도 인정 규칙과 학습자용 AI 튜터를 설정합니다.') + `<section class="g2c">
  <div class="card"><div class="ch"><b>진도 규칙</b></div>
    <label class="rng2"><span><b>완료 기준 시청률</b><small>이 비율 이상 보면 완료</small></span><input type="range" min="50" max="100" step="5" value="${p.watchThr}" data-chg="pg" data-k="watchThr"><em>${p.watchThr}%</em></label>
    ${sw('realOnly', '실제 재생 구간만 인정', p, '건너뛰기 · 배속 2배 초과 구간 제외')}${sw('autoDone', '기준 도달 시 자동 완료', p, '시청 기준을 넘으면 바로 완료 처리')}${sw('seq', '순차 학습', p, '앞 레슨을 끝내야 다음 레슨이 열림')}${sw('levelUnlock', '단계 잠금', p, '러닝 저니 열림 조건 적용')}
    <label class="rng2"><span><b>과제 재제출 허용</b><small>재제출 요청 후 다시 낼 수 있는 횟수</small></span><input type="range" min="0" max="5" value="${p.resubmit}" data-chg="pg" data-k="resubmit"><em>${p.resubmit}회</em></label></div>
  <div class="card"><div class="ch"><b>AI 학습 튜터</b>${tag(tu.enabled ? '사용 중' : '꺼짐', tu.enabled ? 'g' : '')}</div>
    ${sw('enabled', '튜터 사용', tu, '학습 화면 오른쪽 아래에 표시')}
    <label class="fl">튜터 이름<input maxlength="12" value="${esc(tu.name)}" data-chg="tu" data-k="name"></label>
    <label class="rng2"><span><b>1인 하루 질문 수</b><small>비용 조절</small></span><input type="range" min="5" max="50" step="5" value="${tu.daily}" data-chg="tu" data-k="daily"><em>${tu.daily}회</em></label>
    <label class="fl">도움 범위<select data-chg="tu" data-k="help"><option value="hint" ${tu.help === 'hint' ? 'selected' : ''}>힌트만</option><option value="feedback" ${tu.help === 'feedback' ? 'selected' : ''}>초안을 평가 기준으로 피드백</option></select></label>
    <label class="fl">모델<select data-chg="tu" data-k="model"><option value="haiku" ${tu.model === 'haiku' ? 'selected' : ''}>빠르고 저렴(Haiku 5.5, 기본)</option><option value="sonnet" ${tu.model === 'sonnet' ? 'selected' : ''}>깊이 있는 답변(Sonnet 5.5)</option></select></label>
    ${sw('loginOnly', '로그인한 ' + t('learner') + '만', tu, '비로그인 방문자에게는 숨김')}
    <div class="ch"><b>최근 7일 질문 수</b><small>대화 내용은 저장하지 않고 횟수만 집계</small></div><div class="spark">${S.tutorUsage.map(u => `<div><i style="height:${u.n / mx * 100}%"></i><small>${esc(u.d)}</small><b>${u.n}</b></div>`).join('')}</div>
    <p class="mini">과제 결과물을 대신 써 주지 않습니다. 위기 상황은 상담 기관 안내, 개인정보 질문은 거절합니다.</p></div></section>`;
};
ACT.pg = el => { const v = el.type === 'checkbox' ? el.checked : +el.value; S.settings.progress[el.dataset.k] = v; save(); if (el.type === 'range') el.nextElementSibling.textContent = v + (el.dataset.k === 'watchThr' ? '%' : '회'); else toast('저장했습니다.', 'ok'); };
ACT.tu = el => { const v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value; S.settings.tutor[el.dataset.k] = v; save(); if (el.type === 'range') el.nextElementSibling.textContent = v + '회'; else if (el.type === 'checkbox') render(); else toast('저장했습니다.', 'ok'); };

/* ═════════ 공지 · 알림함 ═════════ */
VIEWS.board = () => {
  const N = [...(S.notices || []), ...S.classes.flatMap(c => c.notices.map(n => ({ ...n, cls: c.name })))];
  return head('', `공지는 ${esc(t('site'))}에 바로 반영되고, 알림함 메시지는 대상의 알림함으로 전달됩니다.`, `<button class="btn" data-act="notice-new">+ 공지</button><button class="btn ink" data-act="al-new">알림 보내기</button>`) +
    `<section class="g2c"><div class="card"><div class="ch"><b>공지</b><small>${N.length}건</small></div>${N.slice(0, 12).map(n => `<div class="row"><span>${n.pin ? tag('고정', 'mg') + ' ' : ''}${esc(n.title)}${n.cls ? ` <small class="mini">${esc(n.cls)}</small>` : ''}</span><small>${esc(n.at)}</small></div>`).join('') || '<div class="empty">공지가 없습니다.</div>'}</div>
    <div class="card"><div class="ch"><b>알림함 발송 내역</b></div>${table(['보낸 날', '대상', '제목', '읽음'], S.alerts.map(a => [esc(a.at), esc(a.to), esc(a.title), `${bar(a.read)} ${a.read}%`]))}</div></section>`;
};
ACT['al-new'] = () => modal('알림 보내기', `<label class="fl">대상<select name="to"><option value="전체">전체</option>${S.groups.map(g => `<option>${esc(g.name)}</option>`).join('')}</select></label><label class="fl">제목<input name="t" maxlength="60"></label><label class="fl">내용<textarea name="b" rows="4"></textarea></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '보내기', kind: 'pri', run: w => { if (!fv(w, 't')) return false; S.alerts.unshift({ id: uid('al'), at: today(), to: fv(w, 'to'), title: fv(w, 't'), read: 0 }); logAudit('알림 발송 — ' + fv(w, 't')); save(); render(); toast('알림함으로 보냈습니다.', 'ok'); } }]);

/* ═════════ 등록 · 초대 ═════════ */
VIEWS.enroll = () => {
  const wait = S.members.filter(m => m.grade === '승인 대기'); const U = S.org.type === 'univ';
  return head('', U ? '학번 목록을 붙여 넣으면 접근코드를 발급합니다. 이름 · 연락처는 받지 않고 학번 · 학과만 저장합니다(학교 SSO 연계 예정).' : `${esc(t('learner'))}을 일괄 등록하거나 초대합니다. 일괄 등록은 1회 최대 100명입니다.`) +
    `<section class="g2c">${U ? `<div class="card"><div class="ch"><b>학번 등록 · 접근코드 발급</b></div><label class="fl">학번, 학과(줄마다 1명)<textarea id="enL" rows="6" placeholder="20262001, 컴퓨터공학과&#10;20262002, 경영학과"></textarea></label><button class="btn ink" data-act="en-codes">접근코드 발급</button>
      ${S.codes.length ? table(['학번', '학과', '접근코드', '발급일'], S.codes.slice(0, 20).map(c => [esc(c.sid), esc(c.dept), `<code>${esc(c.code)}</code>`, c.at])) + `<div class="bar2"><button class="btn sm" data-act="en-csv">CSV</button><button class="btn sm" data-act="en-copy">안내 문구 복사</button></div>` : ''}</div>`
      : `<div class="card"><div class="ch"><b>일괄 등록</b></div><p class="mini">CSV 양식(이름, 닉네임, 이메일, 비밀번호, 연락처, 추가정보…)으로 올리면 형식 · 중복을 검사하고 준회원으로 등록합니다.</p><div class="bar2"><button class="btn ink" data-act="mem-bulk">CSV 올리기</button><button class="btn" data-act="bulk-tpl">양식 내려받기</button></div></div>`}
    <div class="card"><div class="ch"><b>초대</b></div><p class="mini">연락처(알림톡) · 링크 · 이메일로 초대합니다.</p><div class="bar2"><button class="btn" data-act="mem-invite">초대 보내기</button><button class="btn" data-act="mem-q">가입 추가 질문</button></div>
      <div class="ch" style="margin-top:14px"><b>가입 승인 대기</b>${tag(wait.length + '명', wait.length ? 'y' : '')}${wait.length ? '<button class="btn sm ink" data-act="mem-approve">모두 승인</button>' : ''}</div>${wait.map(m => `<div class="row"><span>${esc(m.name)}</span><small>${m.joined}</small></div>`).join('') || '<p class="mini">대기 중인 회원이 없습니다.</p>'}</div></section>`;
};
ACT['en-codes'] = () => { const lines = $('#enL').value.split('\n').map(s => s.split(',').map(x => x.trim())).filter(x => /^\d{6,10}$/.test(x[0] || '')); if (!lines.length) { toast('학번(숫자 6~10자리)을 줄마다 입력하세요.', 'warn'); return; } const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const mk = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => ch[b % ch.length]).join(''); lines.forEach(([sid, dept]) => { if (!S.codes.some(c => c.sid === sid)) S.codes.unshift({ sid, dept: (dept || '').slice(0, 20), code: mk(), at: today() }); }); logAudit(`접근코드 발급 ${lines.length}건`); save(); render(); toast(`${lines.length}건 발급했습니다. 학과 사무실에 배포하세요.`, 'ok'); };
ACT['en-csv'] = () => downloadCSV(`접근코드_${today()}.csv`, ['학번', '학과', '접근코드', '발급일'], S.codes.map(c => [c.sid, c.dept, c.code, c.at]));
ACT['en-copy'] = () => { const txt = `[${S.org.name}] 학습 포털 첫 로그인 안내\n주소: https://${S.org.domain}\n학번과 접근코드로 로그인한 뒤 비밀번호를 설정하세요.`; try { navigator.clipboard.writeText(txt); toast('안내 문구를 복사했습니다.', 'ok'); } catch (e) { toast('복사하지 못했습니다.', 'warn'); } };

/* ═════════ 설정 › 메뉴 구성 (공간 순서 · 탭 켜기/끄기 · 순서) ═════════ */
function navEditor() {
  return `<p class="mini">왼쪽 공간의 순서와, 공간 안 탭을 켜고 끄고 순서를 바꿉니다. 끈 탭의 기능은 AI SAM에게 말로 요청하면 여전히 쓸 수 있습니다.</p>
  <div class="bar2"><button class="btn sm" data-act="menu-reset">${esc(TYPES[S.org.type].name)} 추천 구성으로 되돌리기</button></div>
  <div class="navedit">${S.nav.ws.map((w, wi) => `<div class="card nw"><div class="nwh">${ic(WS[w].icon, 18)}<b>${esc(lab(WS[w]))}</b><span class="sp"></span>${w === 'home' ? tag('고정') : `<button class="btn sm ghost" data-act="ws-mv" data-v="${wi}" data-d="-1" aria-label="위로">↑</button><button class="btn sm ghost" data-act="ws-mv" data-v="${wi}" data-d="1" aria-label="아래로">↓</button>`}</div>
    ${(S.nav.tabs[w] || []).length ? `<ul class="medit" data-ws="${w}">${S.nav.tabs[w].map((x, i) => { const d = MENU[x.id]; return `<li draggable="true" data-i="${i}" class="${x.on ? '' : 'off'}"><span class="hdl" aria-hidden="true">⋮⋮</span><b>${esc(mlabel(x.id))}</b>${d.only ? tag(TYPES[d.only].name + ' 전용', d.only === S.org.type ? 'g' : '') : ''}${d.owner ? tag('정운영자') : ''}<span class="sp"></span><button class="btn sm ghost" data-act="tab-mv" data-w="${w}" data-v="${i}" data-d="-1" aria-label="위로">↑</button><button class="btn sm ghost" data-act="tab-mv" data-w="${w}" data-v="${i}" data-d="1" aria-label="아래로">↓</button><label class="sw"><input type="checkbox" ${x.on ? 'checked' : ''} data-chg="tab-on" data-w="${w}" data-v="${i}" aria-label="${esc(mlabel(x.id))} 켜기"><span></span></label></li>`; }).join('')}</ul>` : '<p class="mini">탭 없이 한 화면으로 열립니다.</p>'}</div>`).join('')}</div>`;
}
ACT['ws-mv'] = el => { const a = S.nav.ws, i = +el.dataset.v, k = i + +el.dataset.d; if (k < 1 || k >= a.length) return; [a[i], a[k]] = [a[k], a[i]]; save(); render(); };
ACT['tab-mv'] = el => { const a = S.nav.tabs[el.dataset.w], i = +el.dataset.v, k = i + +el.dataset.d; if (k < 0 || k >= a.length) return; [a[i], a[k]] = [a[k], a[i]]; save(); render(); };
ACT['tab-on'] = el => { S.nav.tabs[el.dataset.w][+el.dataset.v].on = el.checked; save(); render(); };
ACT['menu-reset'] = () => { S.nav = presetNav(S.org.type); save(); render(); toast('추천 구성으로 되돌렸습니다.', 'ok'); };
AFTER.push(() => { $$('.medit[data-ws]').forEach(ul => { let from = -1; const w = ul.dataset.ws;
  ul.addEventListener('dragstart', e => { const li = e.target.closest('li'); from = +li.dataset.i; li.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; });
  ul.addEventListener('dragover', e => { e.preventDefault(); const li = e.target.closest('li'); $$('li', ul).forEach(x => x.classList.toggle('over', x === li)); });
  ul.addEventListener('drop', e => { e.preventDefault(); const li = e.target.closest('li'); if (!li || from < 0) return; const a = S.nav.tabs[w]; const [it] = a.splice(from, 1); a.splice(+li.dataset.i, 0, it); save(); render(); });
  ul.addEventListener('dragend', () => $$('li', ul).forEach(x => x.classList.remove('drag', 'over'))); }); });
