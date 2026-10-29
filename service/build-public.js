'use strict';
/* 데모 화면(didisam/)을 운영 서비스용 public/으로 복사하고 index.html만 운영용으로 바꾼다.
   - live.js(서버 데이터 포트)를 boot.js 앞에 넣는다
   - CSP: 브라우저 → api.anthropic.com 직접 호출 제거(서버 게이트웨이), form-action 'self' */
const fs = require('node:fs'); const path = require('node:path');
const [src, dst] = [path.resolve(process.argv[2] || '../didisam'), path.resolve(process.argv[3] || 'public')];
fs.rmSync(dst, { recursive: true, force: true }); fs.cpSync(src, dst, { recursive: true });
const p = path.join(dst, 'index.html'); let h = fs.readFileSync(p, 'utf8');
if (!h.includes('<script src="boot.js"></script>')) throw new Error('boot.js 태그를 찾지 못했습니다');
h = h.replace('<script src="boot.js"></script>', '<script src="live.js"></script>\n<script src="boot.js"></script>');
h = h.replace(/ https:\/\/api\.anthropic\.com/g, '').replace("form-action 'none'", "form-action 'self'");
h = h.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="디디쌤 스튜디오 — AI 우선 교육 운영 어드민. 기관별 데이터룸 분리.">');
fs.writeFileSync(p, h);
if (!fs.existsSync(path.join(dst, 'live.js'))) throw new Error('live.js 없음');
console.log('public 준비:', dst);
