# Ver2 공통 부품 — `didisam/v2.css`

색은 dds.css 토큰만 씁니다(다크 자동). 초록 바탕 글자는 `--on-pr`, 노랑 계열(익히는 중 · 승인 대기)은 `--warnl` / `--t-warn`. 상태는 `is-on` · `is-cur` · `is-lock` · `is-next` · `is-fut` · `is-done` 클래스로 바꿉니다. 정책이 꺼진 기관에서는 이 클래스를 출력하지 않습니다.

| 부품 | 클래스 | 예시 |
|---|---|---|
| 레벨 칩 | `v2-lv v2-lv--l0~l3` | `<span class="v2-lv v2-lv--l1">L1 코치</span>` |
| 레벨 선택 카드(m1) | `v2-lvgrid` > `v2-lvcard [is-on]` · `__ico` · `__t` | `<button class="v2-lvcard is-on"><span class="v2-lvcard__ico">…</span><div><h3>코치 <em>L1</em></h3><p>…</p></div></button>` |
| 정책 4단 선택(m6) | `v2-seg` > `* [is-on]` | `<div class="v2-seg"><button class="is-on">L1<small>코치</small></button>…</div>` |
| AI 배지(m1·m2) | `v2-aibg [--sm · --off]` · `__ico` · `v2-why` | `<div class="v2-aibg"><span class="v2-aibg__ico">…</span><div><b>AI 코치 L1</b><span>정답은 알려 주지 않아요</span></div></div>` |
| 힌트 사다리(m2) | `v2-hl [--mini]` > `v2-hs [is-cur · is-lock · is-next]` · `__n` · `__t` · `__box` | `<li class="v2-hs is-lock"><span class="v2-hs__n">3</span><div class="v2-hs__t"><b>부분 예시</b><p>내 시도를 적으면 열려요</p></div></li>` |
| 선생님께 넘기기 | `v2-hand` | `<a class="v2-hand">선생님께 질문 넘기기</a>` |
| 숙달 칩 3상태(m4) | `v2-ms--done` 숙달 · `--prog` 익히는 중 · `--new` 미도달 | `<span class="v2-ms v2-ms--prog">익히는 중</span>` |
| 숙달 칸 · 개념 행 | `v2-pips` > `i.f · i.a` / `v2-cpt [is-cur · is-done]` · `__tx` | `<div class="v2-pips"><i class="f"></i><i class="a"></i><i></i></div>` |
| 루프 4단계(m3) | `v2-loop` > `v2-sg--struggle · --expand · --reflect · --check` + `v2-loop__ar` | `<div class="v2-sg v2-sg--reflect"><h5>성찰<small>L1</small></h5><p>…</p></div>` |
| 루프 템플릿 카드 | `v2-tpl` > `v2-tp [is-on]` · 범례 `v2-lg` | `<button class="v2-tp is-on"><b>개념형</b><p>…</p></button>` |
| 비전 카드(m7) | `v2-vsn` · `__lb` · `__gl` > `__g [is-ph]` · `__own` | `<div class="v2-vsn__g"><em>1</em>12월까지 …</div>` |
| 홈 한 줄 비전(m8) | `v2-vline` · `__fl` | `<div class="v2-vline"><span class="v2-vline__fl">…</span><div><small>나의 비전</small><b>…</b></div></div>` |
| 대화 진행 칸 | `v2-segs` > `i.f · i.c` | `<div class="v2-segs"><i class="f"></i><i class="c"></i><i></i>…</div>` |
| 이번 주 요약(m4) | `v2-sum` > `div [is-p]` | `<div class="v2-sum"><div><b>7개</b><small>작은 성취</small></div>…</div>` |
| 여정 정거장(m8) | `v2-jl [is-cur · is-fut]` · `__k` · `__pt` | `<div class="v2-jl is-cur"><span class="v2-jl__k">…</span><div><b>…</b><small>…</small></div><span class="v2-jl__pt">+10</span></div>` |
| 여정 점 | `v2-node [is-cur · is-fut · is-start]` | `<span class="v2-node is-cur"></span>` |
| 작은 성취 알림 | `v2-ach` · `__ico` | `<div class="v2-ach"><span class="v2-ach__ico">…</span>개념 숙달!<span class="v2-jl__pt">+5</span></div>` |
| 승인 대기(m5) | `v2-pend [--draft · --sent]` · `v2-warnbar` | `<span class="v2-pend">초안 · 아직 확정 전</span>` |
| 일반 칩 | `v2-chip [--g · --gs · --a · --k · --n · --sm]` | `<span class="v2-chip v2-chip--g">학번</span>` |

- 로드: `index.html` · `learner.html` 끝에 `v2.css`(개발자 css 뒤, `?v=`는 통합 담당이 붙임).
- 휴대폰(≤640px): 레벨 카드 1열, 템플릿 2열, 루프 세로 배치.
