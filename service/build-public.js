'use strict';
/* 데모 화면(didisam/)을 운영 서비스용 public/으로 복사하고 index.html만 운영용으로 바꾼다.
   - live.js(서버 데이터 포트)를 boot.js 앞에 넣는다
   - CSP: 브라우저 → api.anthropic.com 직접 호출 제거(서버 게이트웨이), form-action 'self' */
const fs = require('node:fs'); const path = require('node:path');
const [src, dst] = [path.resolve(process.argv[2] || '../didisam'), path.resolve(process.argv[3] || 'public')];
fs.rmSync(dst, { recursive: true, force: true }); fs.cpSync(src, dst, { recursive: true });
const p = path.join(dst, 'index.html'); let h = fs.readFileSync(p, 'utf8');
const BOOT = /<script src="boot\.js(\?v=[^"]*)?"><\/script>/;
if (!BOOT.test(h)) throw new Error('boot.js 태그를 찾지 못했습니다');
h = h.replace(BOOT, m => '<script src="live.js' + (m.match(/\?v=[^"]*/) || [''])[0] + '"></script>\n' + m);
h = h.replace(/ https:\/\/api\.anthropic\.com/g, '').replace("form-action 'none'", "form-action 'self'");
h = h.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="디디쌤 스튜디오 — AI 우선 교육 운영 어드민. 기관별 데이터룸 분리.">');
fs.writeFileSync(p, h);
/* v31 교강사 전용 화면: 어드민 화면을 교강사 모듈로 표시한다 */
if (!h.includes('<meta name="viewport"')) throw new Error('viewport 태그를 찾지 못했습니다');
fs.writeFileSync(path.join(dst, 'tutor.html'), h.replace('<meta name="viewport"', '<meta name="dd-module" content="tutor">\n<meta name="viewport"').replace(/<title>[^<]*<\/title>/, '<title>디디쌤 교강사</title>'));
/* 학습자 화면: 운영에서는 튜터도 서버 경유 → 브라우저의 Anthropic 직접 호출 허용을 뺀다 */
const lp = path.join(dst, 'learner.html'); if (fs.existsSync(lp)) fs.writeFileSync(lp, fs.readFileSync(lp, 'utf8').replace(/ https:\/\/api\.anthropic\.com/g, ''));
if (!fs.existsSync(path.join(dst, 'live.js'))) throw new Error('live.js 없음');
for (const f of ['aiguard.js', 'safehtml.js']) if (!fs.existsSync(path.join(dst, f))) throw new Error(f + ' 없음(v25 보안 가드)');
fs.rmSync(path.join(dst, 'native'), { recursive: true, force: true }); /* 앱 포장 설정은 서버에 올리지 않음 */
console.log('public 준비:', dst);
