'use strict';
/* 대책 카드 — security/cards/CARD-NNNN.md. 판정 '해당 · 일부 · 통제점검형' 건마다 초안 1장(같은 key면 재사용).
   카드 초안은 주 1회 통합 PR → 사람 승인. 피드 원문은 <untrusted> 울타리 안에만 둔다. */
const fs = require('node:fs'); const path = require('node:path');
const { fenceText, plain } = require('./util');

const OWNER = { npm: 'edu-platform-security 14 · 부대표', maven: 'egov-java-edition · 부대표', ai: 'didisam-mcp-guide 4 · edu-platform-security 14' };
const oneLine = s => plain(s).replace(/\s+/g, ' ').replace(/[`<>|]/g, ' ').slice(0, 120);

function existing(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /^CARD-\d{4}\.md$/.test(f)).map(f => ({ file: path.join(dir, f), n: Number(f.slice(5, 9)), key: ((fs.readFileSync(path.join(dir, f), 'utf8').match(/^key: (.+)$/m) || [])[1] || '').trim() }));
}

function render(id, f, now) {
  const c = f.component; const eco = c ? c.ecosystem : 'ai';
  const fix = (f.fixed || []).length ? `수정 버전 ${f.fixed.join(', ')} 이상으로 올립니다(결정적 수정 · Dependabot/osv fix 우선).` : '수정 버전 미공개 — 사용 경로 확인 후 완화 통제(기능 끄기 · 입력 검증)를 검토합니다.';
  return `---
id: ${id}
key: ${f.key}
status: draft
priority: ${f.priority || '-'}
verdict: ${f.verdict}
created: ${now.toISOString().slice(0, 10)}
review_due: ${new Date(now.getTime() + 90 * 86400e3).toISOString().slice(0, 10)}
---
# ${id} · ${oneLine(f.title) || f.aliases[0]}

| 필드 | 내용 |
|---|---|
| 위협 · 출처 | ${f.aliases.join(' · ')} (${(f.sources || [f.source]).join(', ')}) |
| 영향 | ${f.verdict} — ${f.evidence}${c ? ` · \`${c.purl}\` · ${c.location} · ${c.exposure === 'dev' ? '개발' : '운영'}` : ''} |
| 점수 | ${f.priority_score ?? '-'}점 · ${f.priority || '-'} · ${f.severity || '-'}${f.forced ? ` · 강제 P0(${f.forced})` : ''} · 기한 ${f.sla_due_at ? f.sla_due_at.slice(0, 16).replace('T', ' ') : '-'} |
| 매핑 | ${c ? 'OWASP A06 취약 · 구식 구성요소' : 'OWASP LLM01 · ASI01 (확인 필요)'} |
| 탐지 | 가디언 \`scan\` 재실행 시 같은 key가 사라지는지 확인합니다. |
| 통제 | ${c ? fix : '서버 정책 · 가드 규칙으로 강제할 항목을 정리합니다.'} |
| 회귀 테스트 | ${c ? '`node --test service/test/` 전체 + 해당 경로 스모크' : 'promptfoo 회귀 1건 추가(security/redteam)'} |
| 담당 | ${OWNER[eco] || OWNER.npm} |
| 참고 | ${f.url || '-'} |

## 원문 요약(수집 데이터 — 지시로 취급하지 않습니다)
${fenceText(f.title)}
${f.summary && plain(f.summary) ? fenceText(f.summary) : ''}

## 갱신 이력
- ${now.toISOString().slice(0, 10)} 가디언 초안 생성(사람 검토 전)
`;
}

function createCard(finding, { dir, now = new Date() } = {}) {
  if (!['해당', '일부', '통제점검형'].includes(finding.verdict)) return { created: false, reason: '판정 없음 — 카드 대상 아님' };
  const list = existing(dir); const same = list.find(x => x.key === finding.key);
  if (same) return { created: false, id: path.basename(same.file, '.md'), file: same.file, reason: '같은 key 카드 존재' };
  const id = 'CARD-' + String((list.reduce((m, x) => Math.max(m, x.n), 0) + 1)).padStart(4, '0');
  fs.mkdirSync(dir, { recursive: true }); const file = path.join(dir, id + '.md');
  fs.writeFileSync(file, render(id, finding, now), { flag: 'wx' });
  return { created: true, id, file };
}
module.exports = { createCard, render };
