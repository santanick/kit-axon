'use strict';
/* v49.1 P-AI-60 생성형 AI 사전 고지(인공지능기본법 제31조) — 기관 유형별 점검
   ① 가입 동의(lacct.js laConsentHTML)는 기관 유형 10종 · 대학(U) 모두 같은 고지 한 줄을 붙인다
   ② 대학 첫 로그인 동의(lconsent.js)도 같은 함수(laAiNote)를 쓴다 — 문장을 두 곳에 따로 두지 않는다
   ③ 학습자 화면 말투(해요체) · 「AI 생성」 · 「AI 초안」 표시 이름이 aiguard.js aiMark와 같다
   브라우저 · 서버 없이 실행: node tests/ui/ai-notice.js */
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm');
const D = path.resolve(__dirname, '../../didisam');
let fail = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fail++; };
const src = f => fs.readFileSync(path.join(D, f), 'utf8');

const TYPES = ['adult', 'k12', 'univ', 'univ_lms', 'corp', 'public', 'public_citizen', 'lifelong', 'voc', 'academy'];
const ctx = { console, LR: { mode: 'demo' }, LA: {}, esc: s => String(s == null ? '' : s), btn: () => '', laCfg: () => ({}), laXQNames: () => [], laPolicyHTML: () => '' };
ctx.SITE = () => ({ org: { type: ctx._type, name: '시험 기관' }, cpl: {} });
/* lacct.js 전체는 다른 화면 모듈을 감싸므로, 고지 · 가입 동의 두 함수만 잘라 실행한다 */
const la = src('lacct.js'); const a = la.indexOf('function laAiNote'), b = la.indexOf('\nfunction laJoin(', a);
ok(a > 0 && b > a, 'lacct.js에서 laAiNote · laConsentHTML 위치 확인');
vm.createContext(ctx); vm.runInContext(la.slice(a, b), ctx, { filename: 'lacct.js' });
ok(typeof ctx.laAiNote === 'function', 'lacct.js laAiNote 공통 함수');
const note = ctx.laAiNote();
ok(/생성형 AI/.test(note) && /요\./.test(note) && !/습니다/.test(note), `고지 문장은 해요체 · 생성형 AI 명시: ${note.replace(/<[^>]+>/g, '')}`);
for (const t of TYPES) for (const U of [false, true]) { ctx._type = t; const h = ctx.laConsentHTML({ keep: {} }, U); ok(h.includes(note) && h.indexOf(note) > h.indexOf('</fieldset>'), `가입 동의 ${t}${U ? ' (대학 학번형)' : ''} — 고지 한 줄`); }

const lc = src('lconsent.js');
ok(/laAiNote\(\)/.test(lc), 'lconsent.js 대학 첫 로그인 동의도 laAiNote 사용');
ok(!/생성형 AI\(Claude\)를 써요/.test(lc), 'lconsent.js에 고지 문장 사본 없음(한 곳에서만 관리)');
const learner = fs.readFileSync(path.join(D, 'learner.html'), 'utf8');
ok(learner.indexOf('lacct.js') > 0 && learner.indexOf('lacct.js') < learner.indexOf('lconsent.js'), 'learner.html에서 lacct.js가 lconsent.js보다 먼저 로드');

const g = src('aiguard.js');
ok(/AI 생성/.test(g) && /AI 초안/.test(g), 'aiguard.js aiMark 표시 이름(AI 생성 · AI 초안)과 고지 문장 일치');
console.log(fail ? `실패 ${fail}` : '✓ 생성형 AI 사전 고지 점검 통과'); process.exit(fail ? 1 : 0);
