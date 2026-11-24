'use strict';
/* promptfoo 사용자 정의 제공자 — 모델을 부르지 않고 aiguard 판정만 돌려준다(키 · 네트워크 불필요).
   나중에 실제 모델 대상 레드팀을 붙일 때도 이 판정을 1차 관문으로 둔다. */
const { NODE, judge } = require('../lib');
module.exports = class AiGuardProvider {
  id() { return 'didisam-aiguard'; }
  async callApi(prompt, context) {
    const c = (context && context.vars && context.vars.case) || {};
    const fail = judge(c, NODE);
    return { output: JSON.stringify({ id: c.id, pass: fail.length === 0, fail, score: c.input != null ? NODE.score(c.input) : null }) };
  }
};
