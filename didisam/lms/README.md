# 학사 LMS 묶음 화면(v30~)

- 묶음마다 `lms/<묶음>.js` 하나(필요하면 `lms/<묶음>.css`를 그 JS가 `<link>`로 붙인다). index.html에는 a~q가 모두 미리 걸려 있으므로 index.html · sw.js는 고치지 않는다.
- 파일은 IIFE로 감싸고 기존 패턴을 따른다: `Object.assign(MENU, {...})`, `VIEWS.<id> = () => html`, `ACT['<묶음>-...'] = el => {...}`, 대학 학사 LMS 프리셋(`PRESET.univ_lms.on`)에 메뉴 추가, `ULMS()`일 때만 보이게.
- 기존 화면을 확장할 때는 감싸기(`const base = VIEWS.x; VIEWS.x = () => { const h = base(); ... }`)만 쓰고 원본 파일을 고치지 않는다.
- ACT · MENU · VIEWS 키는 묶음 접두(예: `lmsb-`, `lmsq-`)를 붙여 다른 묶음과 겹치지 않게 한다.
- 데모(정적) 모드: `S.lms.<묶음>` 상태 + 시드 데이터로 동작. 운영(서버) 모드: `/api/lms/<묶음>/...` 호출.
- 연동 지점은 화면 문구로 「데모 동작 / 연동 후 동작」을 구분한다. 개인정보는 학번 · 학과만 저장한다.
