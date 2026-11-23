'use strict';
/* v46 Ver2 AI 게이트웨이 — 외부 AI 호출의 공통 단계를 한곳에 모은다. Java: cmm/DdAiGateway(같은 규칙 · 같은 오류 코드)
   ① 정책(aipol) 정규화 ② 레벨 판정(L0 차단 · L1~L3 지시문) ③ 힌트 단계 검증 ④ 외부 호출(fetch · 시간 초과 · 망 오류)
   ⑤ 기능별 사용량(ai_usage_f, 기관 합계 ai_usage는 기존 쿼리 그대로) · 기능별 한도 ⑥ 대화 기록(가림 뒤 암호화, retain 기한 뒤 삭제)
   정책이 꺼진 기관(aipol.on !== true)은 ②③⑤의 한도 · ⑥을 건너뛰어 기존 요청 · 응답과 같다. */
const crypto = require('node:crypto');

const LV = ['L0', 'L1', 'L2', 'L3'];
const FEATURES = ['tutor', 'studio', 'grade', 'vision', 'lmsqa'];
const RETAIN_DAYS = { term: 183, year: 365 };
const LABEL = { L0: '끄기', L1: '코치', L2: '파트너', L3: '에이전트' };
const DIRECTIVE = {
  L1: '[AI 레벨: 코치(L1)] 이 과제는 학습자가 스스로 풀어야 합니다. 답 · 완성 코드 · 완성 문장을 주지 말고 질문 · 개념 설명 · 방향 힌트로만 돕습니다.',
  L2: '[AI 레벨: 파트너(L2)] 학습자와 함께 생각합니다. 예시 · 부분 초안 · 대안 비교는 줄 수 있지만 제출물 전체를 대신 만들지 않고, 학습자가 판단 근거를 직접 쓰게 합니다.',
  L3: '[AI 레벨: 에이전트(L3)] 실무 과제입니다. 초안 작성 · 정리 · 검토를 맡을 수 있으며, 결과의 근거와 학습자가 확인할 점을 함께 적습니다.',
};
const HINT_NAME = ['', '개념 질문', '방향 힌트', '부분 예시', '반례', '풀이'];
const HINT_DIR = {
  1: '[힌트 1단계 · 개념 질문] 답이나 풀이 방향을 말하지 말고, 학습자가 필요한 개념을 떠올리게 하는 질문 1~2개만 합니다.',
  2: '[힌트 2단계 · 방향 힌트] 어디서부터 생각할지 방향만 한두 문장으로 알려 줍니다. 식 · 코드 · 답은 쓰지 않습니다.',
  3: '[힌트 3단계 · 부분 예시] 비슷한 다른 예의 일부만 보여 줍니다. 이 과제의 답을 그대로 쓰지 않습니다.',
  4: '[힌트 4단계 · 반례] 학습자의 시도가 틀릴 수 있는 반례 · 확인할 경우를 보여 주고 스스로 고치게 합니다.',
  5: '[힌트 5단계 · 풀이] 교수자가 풀이를 허용했고 학습자가 자기 설명을 적었습니다. 풀이 과정을 단계별로 설명하고, 학습자의 자기 설명과 다른 점을 짚습니다.',
};

/* 기관 정책: tenant_state doc.aipol. on이 true일 때만 Ver2 판정이 켜진다(기존 기관은 upgradeState에서 {on:false,v:1}) */
function polOf(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const pre = p.preset && typeof p.preset === 'object' ? p.preset : {};
  const q = p.quota && typeof p.quota === 'object' ? p.quota : {};
  return {
    on: p.on === true,
    lvl: LV.includes(p.lvl) ? p.lvl : 'L1',
    preset: { exam: LV.includes(pre.exam) ? pre.exam : '', assign: LV.includes(pre.assign) ? pre.assign : '' },
    retain: ['term', 'year', 'none'].includes(p.retain) ? p.retain : 'term',
    evalNotice: p.evalNotice !== false,
    train: p.train === true,
    quota: Object.fromEntries(FEATURES.filter(f => Number.isFinite(+q[f]) && +q[f] > 0).map(f => [f, Math.min(100000, Math.round(+q[f]))])),
  };
}
/* 공개 사이트 데이터에 내보내는 값(계약: {on, lvl, retain, evalNotice}만) */
const pubPol = raw => { const p = polOf(raw); return { on: p.on, lvl: p.lvl, retain: p.retain, evalNotice: p.evalNotice }; };

/* 항목 종류: 시험이면 exam, 그 밖(과제 · 레슨)은 assign */
const kindOf = it => (it && /^(exam|test)$/.test(String(it.type || '')) ? 'exam' : 'assign');
/* 레벨 판정: item.ai.lvl → 기관 프리셋[종류] → 기관 lvl → L1. 정책 off면 ''(판정 없음) */
function levelOf(pol, it, kind) {
  if (!pol || !pol.on) return '';
  const a = it && /^(quiz|exam|test|assign)$/.test(String(it.type || '')) && it.ai; if (a && LV.includes(a.lvl)) return a.lvl; /* 영상 항목의 it.ai(장면)는 레벨이 아님 */
  const k = kind || kindOf(it); if (pol.preset && LV.includes(pol.preset[k])) return pol.preset[k];
  return LV.includes(pol.lvl) ? pol.lvl : 'L1';
}
/* 과제 찾기: key = '<cls>/<item>'. 관리자 문서의 classes[].items[](클라이언트가 보낸 레벨은 믿지 않음) */
function findItem(classes, key) {
  const m = /^([\w-]{1,60})\/([\w-]{1,60})$/.exec(String(key || '')); if (!m) return null;
  const c = (Array.isArray(classes) ? classes : []).find(x => x && x.id === m[1]); if (!c) return null;
  const it = (Array.isArray(c.items) ? c.items : []).find(x => x && x.id === m[2]); return it ? { cls: m[1], item: m[2], it } : null;
}

/* 힌트 사다리 검증. cur = lp.hint[key] = { step, tries:[{n,len,at}], selfExp }, h = 요청 { step, attempt, selfExp }
   - 단계는 1~5, 한 번에 한 단계씩만 올라감(건너뛰기 → hint_locked)
   - L1(코치): 2단계부터 새 단계를 열 때마다 새 「내 시도」(2자 이상) 필요. L2 · L3는 시도 없이 다음 단계 가능(잠금 완화)
   - 5단계(풀이)는 모든 레벨에서 item.ai.sol(교수자 허용) + 자기 설명(selfExp) 필요
   통과하면 { next } (lp.hint[key]에 저장할 값, 글 없이 길이만), 아니면 { err: { status, code, msg } } */
function hintCheck(lvl, it, cur, h, now = new Date()) {
  const c = cur && typeof cur === 'object' ? cur : {}; const st = Math.max(0, Math.min(5, Math.round(+c.step || 0)));
  const step = Math.round(+(h && h.step));
  if (!(step >= 1 && step <= 5)) return { err: { status: 400, code: 'hint', msg: '힌트 단계가 올바르지 않습니다.' } };
  const att = String((h && h.attempt) || '').trim(); const len = Math.min(600, att.length);
  const selfExp = c.selfExp === true || (h && h.selfExp === true && step === 5 && len >= 10);
  const lock = msg => ({ err: { status: 409, code: 'hint_locked', msg } });
  if (step > st + 1) return lock(`${HINT_NAME[st + 1]} 단계부터 차례로 열 수 있습니다.`);
  if (step > st) {
    if (step >= 2 && lvl === 'L1' && len < 2) return lock('다음 힌트를 열려면 먼저 「내 시도」를 적어 주세요.');
    if (step === 5) { if (!(it && it.ai && it.ai.sol === true)) return lock('이 과제는 선생님이 풀이 보기를 허용하지 않았습니다.'); if (!selfExp) return lock('풀이를 보려면 먼저 내 풀이를 설명해 주세요(10자 이상).'); }
  }
  const tries = (Array.isArray(c.tries) ? c.tries : []).filter(x => x && typeof x === 'object').map(x => ({ n: Math.round(+x.n || 0), len: Math.round(+x.len || 0), at: String(x.at || '').slice(0, 30) }));
  if (len) tries.push({ n: step, len, at: now.toISOString() });
  return { next: { step: Math.max(st, step), tries: tries.slice(-20), selfExp: !!selfExp }, len };
}
/* 시스템 지시문에 덧붙일 레벨 · 힌트 문장(정책 off면 빈 문자열 → 기존 프롬프트 그대로) */
const directive = (lvl, step) => [DIRECTIVE[lvl] || '', step ? HINT_DIR[step] || '' : ''].filter(Boolean).join('\n');

function createGateway({ pool, inTenant, aiUrl, aiKey, today, keys, HttpErr }) {
  /* 대화 기록 암호화: AES-256-GCM(PII_KEY), AAD = {tid}|ai_turn|{sid}|{q|a}. Java DdAiGateway와 같은 형식(enc1:v1.iv.tag.ct) */
  const seal = (txt, aad) => { if (!keys || !keys.enc) return ''; const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', keys.enc, iv); c.setAAD(Buffer.from(aad)); const ct = Buffer.concat([c.update(String(txt), 'utf8'), c.final()]); return `enc1:v1.${iv.toString('base64url')}.${c.getAuthTag().toString('base64url')}.${ct.toString('base64url')}`; };
  const unseal = (s, aad) => { const [, iv, tag, ct] = String(s).slice(5).split('.'); const d = crypto.createDecipheriv('aes-256-gcm', keys.enc, Buffer.from(iv, 'base64url')); d.setAAD(Buffer.from(aad)); d.setAuthTag(Buffer.from(tag, 'base64url')); return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8'); };

  /* 기능별 호출 수 +1(기관 합계 ai_usage는 호출부의 기존 쿼리가 그대로 센다). 정책 on이고 기능 한도가 있으면 429 ai_feature_quota */
  async function count(c, tid, feature, pol) {
    const f = FEATURES.includes(feature) ? feature : 'studio';
    const r = await c.query('insert into ai_usage_f (tenant_id, day, feature, calls) values ($1, $2, $3, 1) on conflict (tenant_id, day, feature) do update set calls = ai_usage_f.calls + 1 returning calls', [tid, today(), f]);
    const cap = pol && pol.on && pol.quota && pol.quota[f]; if (cap && r.rows[0].calls > cap) throw new HttpErr(429, `오늘 이 기능(${f})의 AI 사용 한도(${cap}회)를 넘었습니다.`, 'ai_feature_quota');
  }
  /* 외부 호출: 요청 본문은 호출부가 만든 그대로 보낸다(동작 불변). 망 오류 · 시간 초과는 502 ai_net */
  async function post(body, ms) {
    const ac = new AbortController(); const to = setTimeout(() => ac.abort(), ms); let r, j;
    try { r = await fetch(aiUrl, { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-api-key': aiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(body) }); j = await r.json().catch(() => ({})); }
    catch (e) { throw new HttpErr(502, e.name === 'AbortError' ? 'AI 응답 시간이 초과되었습니다.' : 'AI 서버에 연결하지 못했습니다.', 'ai_net'); } finally { clearTimeout(to); }
    return { r, j };
  }
  /* 토큰 사용량: 기관 합계(기존 쿼리) + 기능별 */
  async function tokens(tid, feature, u) {
    const f = FEATURES.includes(feature) ? feature : 'studio'; const tin = (u && u.input_tokens) || 0, tout = (u && u.output_tokens) || 0;
    await inTenant(pool, tid, async c => {
      await c.query('update ai_usage set tin = tin + $3, tout = tout + $4 where tenant_id = $1 and day = $2', [tid, today(), tin, tout]);
      await c.query('update ai_usage_f set tin = tin + $4, tout = tout + $5 where tenant_id = $1 and day = $2 and feature = $3', [tid, today(), f, tin, tout]);
    });
  }
  /* 대화 기록: 정책 on · retain이 none이 아닐 때만. q · a는 호출부에서 이미 가린 글. 2% 확률로 기한 지난 기록 정리 */
  async function saveTurn(c, { tid, sid, feature, cls, item, level, q, a, tin, tout }, pol) {
    if (!pol || !pol.on || pol.retain === 'none' || !keys || !keys.enc) return false;
    const days = RETAIN_DAYS[pol.retain] || RETAIN_DAYS.term; const s = String(sid || '');
    await c.query('insert into ai_turn (tenant_id, sid, feature, cls, item, level, q_enc, a_enc, tin, tout, purge_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now() + make_interval(days => $11))',
      [tid, s, feature, String(cls || '').slice(0, 60), String(item || '').slice(0, 60), level || '', seal(String(q || '').slice(0, 4000), `${tid}|ai_turn|${s}|q`), seal(String(a || '').slice(0, 8000), `${tid}|ai_turn|${s}|a`), tin || 0, tout || 0, days]);
    if (Math.random() < 0.02) await purge(c, tid);
    return true;
  }
  const purge = async (c, tid) => (await c.query('delete from ai_turn where tenant_id = $1 and purge_at < now()', [tid])).rowCount;
  const openTurn = (tid, row) => ({ q: unseal(row.q_enc, `${tid}|ai_turn|${row.sid}|q`), a: unseal(row.a_enc, `${tid}|ai_turn|${row.sid}|a`) });
  /* 기능별 사용량(최근 31일 합계) — GET /api/ai/usage의 byFeature */
  const byFeature = async c => Object.fromEntries((await c.query('select feature, sum(calls)::int calls, sum(tin)::bigint tin, sum(tout)::bigint tout from ai_usage_f where day > current_date - 31 group by feature order by feature')).rows.map(r => [r.feature, { calls: r.calls, tin: +r.tin, tout: +r.tout }]));
  return { count, post, tokens, saveTurn, purge, openTurn, byFeature };
}

/* 기능 9 비전 대화(mode:'vision', 정책 on 기관): 6단계 질문 지시문 — 학습 맥락 대신 비전 카드만 돕는다 */
const VISION_Q = ['관심 있는 것', '잘하고 싶은 것', '그 이유', '1년 뒤 나의 모습', '이번 학기 목표 3개', '비전 카드 확인'];
const VISION_DIR = st => { const i = Math.max(1, Math.min(6, Math.round(+st || 1))); return `[비전 대화 ${i}/6단계 · ${VISION_Q[i - 1]}] 학습자의 비전 카드(누구 · 왜 · 어떻게)와 목표를 함께 만듭니다. 이번 단계 질문 하나만 짧게 하고, 학습자 답을 한 문장으로 정리해 돌려줍니다. 이름 · 연락처 · 학교 밖 개인정보는 묻지 않습니다.`; };
module.exports = { VISION_DIR, createGateway, polOf, pubPol, levelOf, findItem, kindOf, hintCheck, directive, LV, LABEL, FEATURES, HINT_NAME, RETAIN_DAYS };
