/* 학습자 화면 시작 — 모든 학습자 스크립트(lrun · lrun2 · lmy)가 로드된 뒤 실행 */
'use strict';
(async () => { $('#lapp').innerHTML = '<div class="lerr"><p>불러오는 중…</p></div>'; await LR.api.load(); lrender(); })();
