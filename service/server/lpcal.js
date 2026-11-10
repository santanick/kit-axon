'use strict';
/* v37.4 학습자 '내 일정'(학습 캘린더 lcal.js) — 학습 기록 lp.cal 정리 규칙. Java PubServiceImpl.cleanCal과 같은 규칙.
   배열 · 최대 300개 · 직렬화 64KB 상한. 항목 필드만 남긴다: id · title(80) · date(YYYY-MM-DD) · time · end(HH:MM) · memo(300) · cls(과정 id) · at(수정 시각 30).
   그 밖의 키(이름 · 연락처 등 개인정보 포함)는 버린다. 같은 id가 여러 번이면 수정 시각(at)이 늦은 것 하나만. */
const CAL_MAX = 300, CAL_BYTES = 64 * 1024;
const ID = /^[\w-]{1,40}$/, DAY = /^\d{4}-\d{2}-\d{2}$/, HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const str = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
function cleanCal(a) {
  if (!Array.isArray(a)) return null;
  const by = new Map();
  for (const x of a.slice(0, CAL_MAX * 2)) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) continue;
    const id = String(x.id == null ? '' : x.id), title = str(x.title, 80), date = String(x.date == null ? '' : x.date);
    if (!ID.test(id) || !title || !DAY.test(date)) continue;
    const y = { id, title, date, time: HM.test(String(x.time || '')) ? String(x.time) : '', end: HM.test(String(x.end || '')) ? String(x.end) : '', memo: str(x.memo, 300), cls: ID.test(String(x.cls || '')) ? String(x.cls) : '', at: str(x.at, 30) };
    const p = by.get(id); if (!p || String(y.at) > String(p.at)) by.set(id, y);
  }
  const out = []; let bytes = 2;
  for (const y of by.values()) { if (out.length >= CAL_MAX) break; const n = Buffer.byteLength(JSON.stringify(y)) + 1; if (bytes + n > CAL_BYTES) break; bytes += n; out.push(y); }
  return out;
}
module.exports = { cleanCal, CAL_MAX, CAL_BYTES };
