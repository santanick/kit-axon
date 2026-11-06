'use strict';
/* 공단 체크리스트 8번: 영문 · 숫자 · 특수문자 중 2종 10자 이상 또는 3종 8자 이상 */
const pwRule = p => { const s = String(p || ''); if (s.length > 64) return false; const n = [/[A-Za-z]/, /\d/, /[^A-Za-z\d\s]/].filter(r => r.test(s)).length; return (n >= 2 && s.length >= 10) || (n >= 3 && s.length >= 8); };
module.exports = { pwRule };
