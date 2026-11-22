/* 디디쌤 스튜디오 v21 — 빈 스튜디오로 시작(샘플 데이터 없음)
   대표님(2026-11-02): '더미데이터가 없는 상황(빈 스튜디오에서 처음부터 AI SAM을 활용하며 채워 가는 과정)을 그대로 따라가 보고 싶다.'
   - 가입 화면에 '빈 스튜디오로 시작' 체크(기본 켜짐). 켜면 학습자 · 과정 · 게시글 · 배지 · 수료증 · 메시지 · 상담 · 문서 · 진단 등 샘플을 비우고,
     메뉴 · 용어 · 홈페이지 템플릿 · 학습자 사이트 틀 · 자동화 레시피(꺼진 상태) · 루브릭 같은 '틀'만 남긴다.
   - 시작 가이드(AI SAM 대화창)를 처음부터 따라 하며 채운다. 같은 브라우저에 연결한 Claude 키는 새 기관에도 이어 쓴다. */
'use strict';
const EMPTY_K = 'didisam.emptyStart';
const emptyPref = () => { try { return localStorage.getItem(EMPTY_K) !== '0'; } catch (e) { return true; } };
function emptyOut() {
  Object.assign(S, { crmLeads: [], groups: [], members: [], parents: [], classes: [], pays: [], bills: [], consults: [], posts: [], books: [], lib: [], badges: [], certs: [], msgs: [], orgs: [], journey: [], alerts: [], notices: [], docs: [], diags: [], tq: [], codes: [], runs: [], bank: [],
    weeks: (S.weeks || []).map(w => ({ ...w, join: 0, badge: 0 })), tutorUsage: (S.tutorUsage || []).map(x => ({ ...x, n: 0 })), hrd: { reports: [] } });
  (S.autos || []).forEach(a => { a.on = false; a.runs = 0; a.last = ''; });
  S.admins = (S.admins || []).filter(a => a.role === 'owner').map(a => ({ ...a, classes: [] }));
  S.org.empty = today(); S.chat = []; S.guides = { done: {}, fin: {} };
  if (S.lsite && Array.isArray(S.lsite.dbooks)) S.lsite.dbooks = []; /* v38 A-8: 샘플 과정으로 만든 디지털북 3권도 비운다 */
  /* v43 E1: 통합 수납 원장(ledger.js) · 시설(fac.js) · 마일리지(mil.js · milrw.js) 시연 데이터도 비운다.
     원장은 units를 빈 배열로 두면 ensure()가 기관 이름으로 본부 1개만 다시 만든다(시연 seedDemo는 units가 배열이 아닐 때만 실행).
     시설은 facilities가 배열이면 다시 채우지 않으므로 템플릿 시설 · 이용권 · 예약 기록을 모두 비우고 설정(키오스크 · 보관 기간)만 남긴다.
     마일리지 보상(milrw)은 지우면 ensure()가 다시 만들되, 회원이 없으므로 권장 보상 목록만 두고 신청 예시는 만들지 않는다. */
  if (S.ledger && Array.isArray(S.ledger.units)) ['units', 'charges', 'receipts', 'allocs', 'refunds', 'closes', 'links', 'imports', 'devices', 'notes'].forEach(k => { S.ledger[k] = []; });
  if (S.fac && Array.isArray(S.fac.facilities)) { S.fac.facilities = []; S.fac.products = []; S.fac.roster = []; S.fac.demo = { bookings: [], passes: [], rentals: [], checkins: [], pays: [], refunds: [], log: [], bans: {}, notes: [], hist: {}, noshowCnt: {} }; }
  if (S.mileage) { S.mileage.entries = []; S.mileage.log = []; S.mileage.funded = {}; }
  delete S.milrw; if (typeof UI !== 'undefined') delete UI.milEv;
  delete S.bld; bInit();
  S.chat = [{ role: 'ai', text: `안녕하세요, AI SAM입니다.\n${S.org.name} 스튜디오가 비어 있는 상태로 준비되었습니다. 위의 '시작 가이드'를 따라 하나씩 채우겠습니다.\n말로 지시하셔도 됩니다. 예: "임직원 대상 AI 교육과정 3개 만들어줘", "연습용 학습자 30명 등록해줘".` }];
  S.audit = (S.audit || []).filter(a => !/^표준 문서 생성/.test(String(a && a.what || ''))); /* v38 비운 샘플 문서의 생성 기록도 남기지 않는다 */
  logAudit('빈 스튜디오로 시작(샘플 데이터 없음)'); save();
}
{ const base = renderSignup; renderSignup = (...a) => { base(...a); const f = $('#suForm'); const btn = f && f.querySelector('button[type=submit]'); if (!btn || $('#suEmpty')) return;
  /* v45: ① 기관 선택 아래 작은 선택지(기본 켜짐 = 지금과 같음) — 운영의 「샘플 데이터로 둘러보기」도 이 체크 하나로 합친다(live.js: LV.sample = !suEmpty.checked) */
  const slot = $('.au-emptyslot'); const at = slot || $('#suErr') || btn;
  at.insertAdjacentHTML(slot ? 'afterend' : 'beforebegin', `<label class="suempty au-empty"><input type="checkbox" id="suEmpty" ${emptyPref() ? 'checked' : ''}><span><b>빈 스튜디오로 시작</b><small>샘플 데이터 없이 시작합니다. 끄면 예시 데이터가 들어간 상태로 둘러볼 수 있습니다.</small></span></label>`);
  $('#suEmpty').addEventListener('change', e => { try { localStorage.setItem(EMPTY_K, e.target.checked ? '1' : '0'); } catch (x) { } }); }; }
{ const base = createOrg; createOrg = (type, name, ed) => {
  const box = $('#suEmpty'); const empty = box ? box.checked : emptyPref();
  let prev = null; try { prev = CL.get(); } catch (e) { }
  base(type, name, ed);
  try { if (empty) emptyOut(); } catch (e) { console.error(e); }
  try { if (prev && prev.key && !CL.get().key) CL.set({ key: prev.key, model: prev.model, chat: prev.chat, docs: prev.docs, site: prev.site }); } catch (e) { }
}; }
/* 계정 메뉴: 빈 스튜디오 새로 만들기 */
ACT['empty-new'] = () => { modal('빈 스튜디오 새로 만들기', `<p class="mini">지금 기관은 그대로 두고, 샘플 데이터가 없는 새 기관을 만듭니다. 상단 계정 메뉴의 데이터룸에서 언제든 이전 기관으로 돌아갈 수 있습니다.</p><label class="fl">기관명<input id="emName" maxlength="30" value="${esc(S.org.name)} (빈 스튜디오)"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { const n = (w.querySelector('#emName')?.value || '').trim() || S.org.name; const ty = S.org.type; try { localStorage.setItem(EMPTY_K, '1'); } catch (e) { } setTimeout(() => createOrg(ty, n), 0); } }]); };
AFTER.push(() => { const p = $('.acp'); if (p && !p.querySelector('[data-act=empty-new]')) p.insertAdjacentHTML('beforeend', `<button type="button" role="menuitem" data-act="empty-new">${ic('spark', 14)} 빈 스튜디오로 새로 시작</button>`); });
COVER.push(['[신규] 빈 스튜디오로 시작: 샘플 없이 시작 가이드로 채우기', 'home', '']);
