'use strict';
/* cases.json(단일 원천)을 promptfoo 테스트로 바꾼다 */
const { cases } = require('../cases.json');
module.exports = cases.map(c => ({
  description: `${c.id} ${c.cat}`,
  vars: { input: c.input != null ? c.input : c.response, case: c },
  assert: [{ type: 'javascript', value: 'JSON.parse(output).pass === true' }]
}));
