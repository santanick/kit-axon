/* v48 콘텐츠 마켓 A10 — AI SAM이 크레딧 패스 견적을 계산합니다(조회형, 저장 · 계약 없음).
   도구: quote_content_pass(계산 = market.js window.mkPlan → marketcalc.plan) · open_pass_builder(A3에 같은 값으로 열기).
   Claude가 없을 때(규칙 엔진)는 answer 감싸기로 같은 견적 카드를 냅니다. 「무제한」이라고 말하지 않고, 보너스는 7%를 넘기지 않습니다.
   구매 기관 화면이므로 산타 몫 · 실효 % · CP 지급액은 결과에 넣지 않습니다. 시범 게이트(window.mkPilot)와 교수자 제외를 따릅니다. market.js 뒤에 로드합니다. */
(function () {
  'use strict';
  if (typeof ACT === 'undefined' || typeof window.mkPlan !== 'function') return;
  const nf = n => (Number(n) || 0).toLocaleString('ko-KR');
  const usable = () => { try { return !!(S && S.org && window.mkPilot && window.mkPilot() && S.me.role !== 'teacher' && (typeof menuOn !== 'function' || menuOn('market'))); } catch (e) { return false; } };
  const COLK = [[/비교과|대학/, 'univ'], [/베이직|기본|공통/, 'basic'], [/산업|반도체|제조/, 'ind'], [/직무|업무/, 'job']];
  /* 「3,000만 원」 「3천만」 「1억 2천만」 「30000000원」 → 원 */
  function money(q) { const s = String(q).replace(/,/g, ''); let m = s.match(/(\d+(?:\.\d+)?)\s*억(?:\s*(\d+)\s*천\s*만?|\s*(\d+)\s*만)?/); if (m) return Math.round(+m[1] * 1e8 + (m[2] ? +m[2] * 1e7 : 0) + (m[3] ? +m[3] * 1e4 : 0));
    m = s.match(/(\d+(?:\.\d+)?)\s*천\s*만/); if (m) return Math.round(+m[1] * 1e7); m = s.match(/(\d+(?:\.\d+)?)\s*만\s*원?/); if (m) return Math.round(+m[1] * 1e4); m = s.match(/(\d{6,})\s*원/); return m ? +m[1] : 0; }
  function parse(q) { const s = String(q || ''); const budget = money(s); const pm = s.replace(/,/g, '').match(/(\d+)\s*(?:명|인)/); const cols = COLK.filter(([re]) => re.test(s)).map(([, k]) => k);
    const cpm = s.match(/1인\s*(\d+(?:\.\d+)?)\s*과정/);
    return { budget: budget || undefined, people: !budget && pm ? +pm[1] : undefined, collections: cols, coursesPerPerson: cpm ? +cpm[1] : undefined, bundle: /번들|구독과\s*함께|플랫폼.*함께/.test(s) }; }
  function quote(x) { const R = window.mkPlan(x); const alt1 = window.mkPlan({ ...x, bundle: true }); const alt2 = window.mkPlan({ ...x, collections: [...new Set([...(x.collections || []), 'basic'])] });
    const C = (window.mkCols ? window.mkCols() : []).filter(c => (x.collections && x.collections.length ? x.collections : []).includes(c.id)).map(c => c.title);
    return { R, alt1, alt2, colN: C.join(' · ') || '선택한 컬렉션', cpp: x.coursesPerPerson || (S.org.type === 'corp' ? 2 : 1.5) }; }
  const out = (x, Q) => ({ 예산: Q.R.budget, 구매크레딧: Q.R.credits, 보너스크레딧: Q.R.bonusCredits, 보너스율: Q.R.bonusBp / 100 + '%', 합계크레딧: Q.R.total, 평균크레딧: Q.R.avgCredits, 예상수강건수: Q.R.enrollments, 예상인원: Q.R.people, 가정: `1인 ${Q.cpp}과정 · 평균 ${Q.R.avgCredits}크레딧`,
    대안: [{ 이름: '플랫폼 구독과 함께 계약', 보너스율: Q.alt1.bonusBp / 100 + '%', 합계크레딧: Q.alt1.total, 예상수강건수: Q.alt1.enrollments, 예상인원: Q.alt1.people }, { 이름: '베이직 컬렉션 포함', 평균크레딧: Q.alt2.avgCredits, 예상수강건수: Q.alt2.enrollments, 예상인원: Q.alt2.people, 안내: '실제 평균은 계산 화면에서 확인' }],
    안내: '크레딧은 학습자가 과정을 시작할 때 CP 정가대로 차감되며, 이용 한도 안에서만 쓸 수 있습니다. 예상 인원은 가정값입니다. AI 사용료는 별도입니다. 저장 · 계약은 A3에서 정운영자가 확정합니다.' });
  /* 견적 카드(디자이너 i A10 마크업) */
  function cardHTML(x, Q) { const R = Q.R;
    return `<p class="mk-a-tool">quote_content_pass · 예산 ${nf(R.budget)}원 · 조회만(저장 안 함)</p><div class="mk-a-q"><div class="mk-a-qh"><span class="mk-bd pass">크레딧</span><b>크레딧 패스 견적 제안</b><span class="tag y">초안 · 저장 전</span></div>
      <div class="mk-a-opt on"><span class="mk-a-rd"></span><div><b>${nf(R.total)}크레딧 · 구매 ${nf(R.credits)} + 보너스 ${nf(R.bonusCredits)}(${R.bonusBp / 100}%)</b><small>${esc(Q.colN)} 평균 ${R.avgCredits}크레딧 기준 · 예상 수강 ${nf(R.enrollments)}건 · 약 ${nf(R.people)}명(1인 ${Q.cpp}과정 가정)</small></div><b class="mk-num">${nf(R.budget)}원</b></div>
      ${x.bundle ? '' : `<div class="mk-a-opt"><span class="mk-a-rd"></span><div><b>플랫폼 구독과 함께 계약 — 보너스 ${Q.alt1.bonusBp / 100}% · ${nf(Q.alt1.total)}크레딧</b><small>약 ${nf(Q.alt1.enrollments)}건 · ${nf(Q.alt1.people)}명</small></div></div>`}
      <div class="mk-a-opt"><span class="mk-a-rd"></span><div><b>베이직 컬렉션 포함</b><small>평균 크레딧이 낮아 예상 인원이 늘어납니다(실제 평균은 계산 화면에서 확인)</small></div></div>
      <p class="mk-a-note">부가세 별도 · 1크레딧 = 1,000원 · 크레딧은 과정을 시작할 때 이용 한도 안에서 차감됩니다 · AI 사용료 별도</p></div>`; }
  const textOf = Q => `예산 ${nf(Q.R.budget / 10000)}만 원이면 ${nf(Q.R.credits)}크레딧에 보너스 ${nf(Q.R.bonusCredits)}크레딧(${Q.R.bonusBp / 100}%)을 더해 ${nf(Q.R.total)}크레딧입니다. ${Q.colN} 컬렉션 평균 ${Q.R.avgCredits}크레딧(정가 ${nf(Q.R.avgCredits * 1000)}원) 기준으로 약 ${nf(Q.R.enrollments)}건, 1인 ${Q.cpp}과정이면 약 ${nf(Q.R.people)}명이 수강할 수 있습니다(가정값).`;
  const norm = x => { const o = { budget: x.budget != null ? Math.max(0, Math.round(+x.budget || 0)) : undefined, people: x.people != null ? Math.max(0, Math.round(+x.people || 0)) : undefined, collections: Array.isArray(x.collections) ? x.collections.filter(c => /^[a-z_]+$/.test(c)) : [], coursesPerPerson: +x.coursesPerPerson || undefined, bundle: !!x.bundle };
    if (!o.collections.length) o.collections = S.org.type === 'univ' ? ['univ'] : S.org.type === 'corp' || S.org.type === 'voc' ? ['ind', 'job'] : ['basic']; return o; };

  if (typeof AG_TOOLS !== 'undefined' && typeof agRun === 'function') {
    AG_TOOLS.push(
      { name: 'quote_content_pass', description: '콘텐츠 마켓 크레딧 패스 견적을 계산합니다(조회형 · 저장 안 함). 예산(원) 또는 예상 인원(명) 중 하나는 꼭 넣습니다. collections: univ(대학 비교과) · basic(베이직) · ind(산업) · job(직무). 금액 · 크레딧은 이 도구 결과만 말하고, 「무제한」이라고 말하지 않습니다. 보너스는 7%를 넘기지 않습니다. 구매 확정은 하지 않고 open_pass_builder로 A3를 엽니다.', input_schema: { type: 'object', properties: { budget: { type: 'number' }, people: { type: 'number' }, collections: { type: 'array', items: { type: 'string' } }, coursesPerPerson: { type: 'number' }, bundle: { type: 'boolean' } } } },
      { name: 'open_pass_builder', description: '견적 값(예산 · 인원 · 컬렉션 · 1인 과정 수 · 번들)을 넣은 채로 콘텐츠 마켓 「크레딧 패스 구성」(A3) 화면을 엽니다.', input_schema: { type: 'object', properties: { budget: { type: 'number' }, people: { type: 'number' }, collections: { type: 'array', items: { type: 'string' } }, coursesPerPerson: { type: 'number' }, bundle: { type: 'boolean' } } } });
    const base = agRun; agRun = (name, x, ctx) => { /* eslint-disable-line no-global-assign */
      if (name === 'quote_content_pass' || name === 'open_pass_builder') { if (!usable()) return { ok: false, 이유: '이 기관에서는 콘텐츠 마켓을 쓸 수 없습니다(시범 기관 · 운영자만).' }; const o = norm(x || {}); if (!o.budget && !o.people) return { ok: false, 이유: '예산(원) 또는 예상 인원(명) 중 하나가 필요합니다.' };
        if (name === 'open_pass_builder') { ctx && ctx.after && ctx.after.push(() => window.mkOpenBuilder(o)); return { ok: true, 안내: '크레딧 패스 구성 화면을 같은 값으로 열었습니다.' }; }
        const Q = quote(o); if (ctx && ctx.cards) ctx.cards.push({ html: cardHTML(o, Q), btn: { act: 'mk-sam-open', v: JSON.stringify(o), label: '패스 구성 화면에서 고치기' } }); return { ok: true, ...out(o, Q) }; }
      return base(name, x, ctx); }; }
  /* 규칙 엔진(Claude 없음): 「예산 3,000만 원으로 비교과 패스 구성해 줘」 */
  if (typeof answer === 'function') { const base = answer; answer = (q, ...r) => { /* eslint-disable-line no-global-assign */
    try { const s = String(q || ''); if (usable() && /(패스|크레딧|콘텐츠\s*마켓)/.test(s) && /(예산|원|명|인원)/.test(s) && !/(삭제|발송|보내)/.test(s)) { const o = norm(parse(s)); if (o.budget || o.people) { const Q = quote(o); return { text: textOf(Q), html: cardHTML(o, Q), btn: { act: 'mk-sam-open', v: JSON.stringify(o), label: '패스 구성 화면에서 고치기' } }; } } } catch (e) { console.error('mksam', e); }
    return base(q, ...r); }; }
  ACT['mk-sam-open'] = el => { let o = {}; try { o = JSON.parse(el.dataset.v || '{}'); } catch (e) { } if (typeof closeModal === 'function') closeModal(); if (ACT['chat-close'] && document.getElementById('drawer')) ACT['chat-close'](); window.mkOpenBuilder(o); };
  window.mkSam = Object.freeze({ parse, quote: x => quote(norm(x)) });
})();
