# prd/

제품 요구사항과 spec. **최상위 권위 source** (Authority Priority 1단계, `history/`와 동급).

## 역할

- 제품이 무엇을 해야 하는지를 정의한다.
- MVP spec, pre-validation 결과 같은 spec 권위를 둔다.
- 거의 안 바뀐다 — 바뀔 때는 변경 경위가 `history/`에 기록되어야 한다.
- plan, docs/aiox, memory는 모두 prd를 cite한다 (역순 X).

## 언제 쓰나

- 새 spec 작성 시.
- pre-validation 결과 기록 시.
- 기존 spec이 바뀔 때 — `history/`에 변경 경위 기록 후 prd 갱신.

## 디렉토리 구조

```
prd/
├── mvp/                 — MVP 단계 spec
│   └── aiox-mvp-spec.md
└── pre-validation/      — MVP 진입 전 검증 spec/결과
    ├── claude-codex-pre-validation.md
    └── sqlite-restart-recovery-pre-validation.md
```

새 단계가 시작되면 하위 디렉토리를 추가한다 (예: `prd/post-mvp/`).

## history/와의 차이

| prd/ | history/ |
|---|---|
| 제품/spec의 권위 (무엇을 만들 것인가) | 결정/incident의 권위 (왜 이렇게 결정했는가) |
| 거의 정적 (drift 회피) | append-only (사건 누적) |
| spec/contract 인용 시 entry point | 결정 cite 시 entry point |

서로 cross-link한다 — prd에서 결정 경위는 history를 cite, history에서 변경된 spec은 prd를 cite.

## 권위 진입점

- `mvp/aiox-mvp-spec.md` — MVP spec (+ `history/15-mvp-design-decisions.history.md`)
- `pre-validation/claude-codex-pre-validation.md` — Claude/Codex 검증 결과
- `pre-validation/sqlite-restart-recovery-pre-validation.md` — SQLite restart 검증 결과

## 관련 규칙

- 권위 우선순위는 `AGENTS.md` Authority Priority 섹션.
- 변경 흐름(권위 문서 → 메모리 → vault)은 `AGENTS.md` Memory와 권위 문서 패턴 섹션.
