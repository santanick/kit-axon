'use strict';
/* 묶음 O 대조 · 스모크용 모의 LLM(Anthropic Messages 형식) — 지시문의 [출력:종류] 표식에 맞는 구조를 돌려준다. 사용: require('./lms-o-mock').start(8099) */
const http = require('node:http');
function reply(b) {
  const sys = (Array.isArray(b.system) ? b.system.map(x => x.text).join('') : String(b.system || ''));
  const last = (b.messages || []).slice(-1)[0] || {}; const u = typeof last.content === 'string' ? last.content : JSON.stringify(last.content || '');
  const kind = (/\[출력:(\w+)\]/.exec(sys) || [])[1] || '';
  if (u.includes('E500')) return [500, { type: 'error', error: { type: 'api_error' } }];
  let text = '모의 응답입니다. 강의자료에 따르면 핵심은 반복 학습입니다 [1].';
  if (kind === 'quiz') {
    const n = +(/문항 (\d+)개/.exec(sys) || [0, 3])[1]; const langs = [...sys.matchAll(/([a-z]{2})\(/g)].map(m => m[1]);
    text = JSON.stringify({ items: Array.from({ length: n }, (_, i) => ({ q: `모의 문항 ${i + 1}: 이 구간의 핵심 개념을 분석하고 비교하시오.`, options: ['가', '나', '다', '라'], answer: i % 4, explain: '모의 해설', tr: Object.fromEntries(langs.map(l => [l, { q: `[${l}] Q${i + 1}`, options: ['A', 'B', 'C', 'D'], explain: `[${l}] explain` }])) })) });
  } else if (kind === 'translate') {
    const m = /<document>\n([\s\S]*)\n<\/document>/.exec(u); let arr = []; try { arr = JSON.parse(m[1]); } catch (e) { }
    text = '번역 결과: ' + JSON.stringify({ paras: arr.map(x => '[EN] ' + x) });
  } else if (kind === 'rubric') {
    const n = +(/평가 기준 (\d+)개/.exec(sys) || [0, 3])[1]; const s = +(/기준마다 (\d+)단계/.exec(sys) || [0, 3])[1];
    text = JSON.stringify({ criteria: Array.from({ length: n }, (_, i) => ({ name: `기준 ${i + 1}`, weight: Math.floor(100 / n), levels: Array.from({ length: s }, (_, k) => ({ score: (s - k) * 10, desc: `${s - k}단계 설명` })) })) });
  } else if (kind === 'eval') text = JSON.stringify({ score: 72.46, rationale: '기준 대부분을 충족합니다.', criteria: [{ name: '기준 1', score: 36 }, { name: '기준 2', score: 36.5 }] });
  else if (kind === 'summary') text = '- 핵심 개념 1\n- 핵심 개념 2\n한 줄 요약: 모의 요약입니다.';
  else if (kind === 'editor') text = '모의 편집 결과입니다.';
  else if (kind === 'discussion') text = '주요 논점: 모의 토론 요약입니다.';
  return [200, { id: 'msg_mock', type: 'message', role: 'assistant', model: b.model, content: [{ type: 'text', text }], stop_reason: 'end_turn', usage: { input_tokens: 11, output_tokens: 7 } }];
}
function start(port) {
  const reqs = [];
  const srv = http.createServer((req, res) => { const ch = []; req.on('data', c => ch.push(c)); req.on('end', () => { let b = {}; try { b = JSON.parse(Buffer.concat(ch).toString('utf8')); } catch (e) { } reqs.push(b); const [st, j] = reply(b); res.writeHead(st, { 'content-type': 'application/json' }); res.end(JSON.stringify(j)); }); });
  return new Promise((ok, no) => { srv.once('error', no); srv.listen(port, '127.0.0.1', () => ok({ srv, reqs })); });
}
module.exports = { start, reply };
if (require.main === module) start(Number(process.argv[2] || 8099)).then(() => console.log('mock up'));
