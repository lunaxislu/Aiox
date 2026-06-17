---
topic: 문서 생성·업데이트 workflow reference
description: product, roadmap, spec, architecture, plans, code/tests owner 기준으로 요구 변경·구현·버그 수정 후 문서 반영과 탐색 방법을 정리한 참고 로그
status: decided
---

## Work Items

## 2026-06-17 · 문서 생성·업데이트 workflow reference

**질문:**

- 일반적인 제품/개발 문서 흐름이 PRD -> architecture/spec 순서인지.
- 요구사항이 변경되면 spec에 수정 또는 추가를 반영하고, 필요하면 architecture에도 반영하는지.
- 특정 구현이나 버그 수정 후 `product`, `roadmap`, `spec`, `architecture`, `plans` 관련 문서를 어떻게 빠르고 정확하게 찾는지.

**확인한 로컬 기준:**

- `docs/architecture/documentation-system.md`는 이 repo의 문서 owner를 이미 정의한다.
- `docs/product/product.md`: 제품 목적, 범위, 원칙.
- `docs/product/roadmap.md`: 우선순위, 공개 전 완료 조건, 추진 순서.
- `docs/specs/`: 외부 동작, interface, protocol, data/state contract.
- `docs/architecture/`: 내부 구조, 책임 배치, module/process/data flow.
- `plans/`: 큰 작업의 단계, 실행 순서, 현재 진행 상태.
- code/tests: 현재 실제 구현이 무엇을 하는지에 대한 fact owner.
- `docs/guides/workflow.md`는 작업 종류와 무관하게 진입·재개 -> 작업 수행 -> owner 문서 반영 -> 종료 흐름을 설명한다.

**일반적인 문서 생성·업데이트 흐름:**

1. 기획자/PM이 PRD 또는 제품 요구사항을 작성한다.
   - 어떤 사용자 문제인가.
   - 왜 필요한가.
   - 범위는 어디까지인가.
   - 성공 기준은 무엇인가.
2. 개발자/테크리드가 technical spec과 architecture를 작성한다.
   - spec은 밖에서 보이는 약속이다. API, CLI, protocol, 상태 전이, error, 호환성 같은 내용을 소유한다.
   - architecture는 안에서 어떻게 나눌지를 설명한다. module 책임, process, data flow, 저장 방식 같은 내용을 소유한다.
3. 실행 계획은 별도로 작성한다.
   - roadmap은 어느 순서로 공개 가능한 상태까지 갈 것인가를 소유한다.
   - plans는 이번 workstream에서 실제로 어떤 순서로 처리할 것인가를 소유한다.
   - logs는 왜 그렇게 판단했고 지금 어디까지 왔는가를 소유한다.

**판단:**

- PRD -> spec -> architecture가 항상 한 번에 순서대로 고정 진행되는 것은 아니다.
- 실제 흐름은 PRD/product intent -> spec 초안 -> architecture 초안 -> 구현 검토 -> spec/architecture 보정이 반복되는 형태에 가깝다.
- 이 repo에서도 spec, architecture, roadmap, plans는 서로 한 번에 끝나는 산출물이 아니라 구현·질문·검증을 거치며 보정되는 owner 문서로 봐야 한다.

**요구사항 변경 시 반영 규칙:**

- 제품 범위나 사용자 가치가 바뀌면 `docs/product/product.md`를 본다.
- 우선순위, 공개 전 완료 조건, 단계가 바뀌면 `docs/product/roadmap.md`를 본다.
- 외부 동작, CLI/API/protocol/envelope/state contract가 바뀌면 `docs/specs/`를 본다.
- 내부 구조, 모듈 책임, 프로세스 흐름이 바뀌면 `docs/architecture/`를 본다.
- 실제 실행 순서나 현재 작업 범위가 바뀌면 `plans/`와 `logs/`를 본다.
- 단순 구현 디테일만 바뀌면 보통 code/tests만 수정해도 충분하다.

**반영 판단:**

- 요구사항 변경이 있다고 해서 무조건 spec과 architecture를 모두 수정하는 것은 아니다.
- 외부 약속이 바뀌면 spec을 수정한다.
- 내부 설계가 바뀌면 architecture를 수정한다.
- 추진 순서가 바뀌면 roadmap/plans를 수정한다.
- 제품 범위가 바뀌면 product를 수정한다.

**구현·버그 수정 후 관련 문서를 빠르게 찾는 후보 workflow:**

1. 먼저 변경을 분류한다.
   - 이 변경은 제품 범위인가?
   - 공개 전 완료 조건인가?
   - 외부 contract인가?
   - 내부 구조인가?
   - 실행 계획인가?
   - 단순 구현 사실인가?
2. owner 문서에서 시작한다.
   - 일반 기능/요구 변경: `product -> roadmap -> spec -> architecture -> plans/logs -> code/tests`
   - 버그 수정: `code/tests -> spec 영향 확인 -> architecture 영향 확인 -> plans/logs 기록`
3. `rg`로 역참조를 찾는다.
   - envelope 관련 예: `rg -n "envelope|metadata|capability|G1|G2" docs plans logs src test`
   - 특정 파일/함수/CLI/protocol 관련 예: `rg -n "파일명|함수명|CLI 옵션|protocol method" docs plans logs src test`
4. 문서 impact checklist를 적용한다.
   - 외부에서 관찰되는 동작이 바뀌었나? -> spec
   - 내부 책임/flow가 바뀌었나? -> architecture
   - 공개 전 조건이나 우선순위가 바뀌었나? -> roadmap
   - 실행 순서/작업 상태가 바뀌었나? -> plans/logs
   - 제품 범위나 원칙이 바뀌었나? -> product
   - 아니면 code/tests만으로 충분한가?

## "Code Changed → Check These Docs" 자동화 (2026-06-17 추가)

**핵심 아이디어:**
- 코드 어느 부분이 변경되었는지에 따라, 자동으로 "이 문서들을 확인/업데이트해야 한다"는 리스트를 생성한다.
- 문서 누락을 방지하고 개발자 경험을 개선한다.

**파일 변경 → 문서 체크리스트 매핑 예시:**
```
변경된 코드 패턴          →  확인해야 할 문서
─────────────────────────────────────────────
src/adapter/         →  docs/architecture/, AGENTS.md
src/protocol/        →  docs/specs/aiox-a2a.md
src/daemon/          →  docs/architecture/, docs/product/roadmap.md
.agents/skills/      →  docs/architecture/local-agent-runtime.md, AGENTS.md
docs/product/        →  docs/product/product.md (기획자 검토)
```

**구현 방식 1 — git pre-commit hook:**
```bash
#!/bin/bash
# scripts/check-docs.sh

CHANGED_FILES=$(git diff --name-only --cached)
DOCS_TO_CHECK=()

if echo "$CHANGED_FILES" | grep -qE '^src/adapter/|^src/protocol/'; then
    DOCS_TO_CHECK+=("docs/specs/aiox-a2a.md")
    DOCS_TO_CHECK+=("docs/architecture/")
fi

if echo "$CHANGED_FILES" | grep -qE '^src/daemon/'; then
    DOCS_TO_CHECK+=("docs/architecture/")
    DOCS_TO_CHECK+=("docs/product/roadmap.md")
fi

if echo "$CHANGED_FILES" | grep -qE '\.agents/skills/'; then
    DOCS_TO_CHECK+=("docs/architecture/local-agent-runtime.md")
    DOCS_TO_CHECK+=("AGENTS.md")
fi

if [ ${#DOCS_TO_CHECK[@]} -gt 0 ]; then
    echo "📋 이 문서들을 확인하세요:"
    printf '%s\n' "${DOCS_TO_CHECK[@]}" | sort | uniq
    echo ""
    echo "확인 후 git add 하세요."
fi
```

**구현 방식 2 — PR 체크리스트 자동 생성:**
```bash
# scripts/gen-pr-checklist.sh
CHANGED_FILES=$(git diff origin/main...HEAD --name-only)

echo "## 📋 문서 확인 체크리스트" >> /tmp/pr-checklist.md
echo "" >> /tmp/pr-checklist.md

if echo "$CHANGED_FILES" | grep -qE '^src/protocol/'; then
    echo "- [ ] \`docs/specs/aiox-a2a.md\` — Protocol spec 동기화" >> /tmp/pr-checklist.md
fi

if echo "$CHANGED_FILES" | grep -qE '^src/'; then
    echo "- [ ] \`docs/architecture/\` — 아키텍처 다이어그램/설명 업데이트" >> /tmp/pr-checklist.md
fi

if echo "$CHANGED_FILES" | grep -qE '^(src/|docs/product/)'; then
    echo "- [ ] \`docs/product/roadmap.md\` — Phase/timeline 반영" >> /tmp/pr-checklist.md
fi

cat /tmp/pr-checklist.md
```

**구현 방식 3 — 매핑 테이블 기반 (추천):**
```json
# scripts/doc-mapping.json
{
  "patterns": [
    {
      "filePattern": "^src/adapter/",
      "docs": ["docs/architecture/", "AGENTS.md"],
      "reason": "adapter 변경 → 아키텍처 영향"
    },
    {
      "filePattern": "^src/protocol/",
      "docs": ["docs/specs/aiox-a2a.md"],
      "reason": "protocol 변경 → spec 필수 동기화"
    },
    {
      "filePattern": "^\\.agents/skills/",
      "docs": ["AGENTS.md", "docs/architecture/local-agent-runtime.md"],
      "reason": "skill 추가 → 문서 인벤토리 업데이트"
    }
  ]
}
```

**실제 사용 흐름:**
```bash
$ git add src/protocol/envelope.ts
$ git commit -m "fix: envelope routing logic"

# Hook이 자동 실행 ↓
📋 이 문서들을 확인하세요:
  • docs/specs/aiox-a2a.md
  • docs/architecture/

확인 후 git add 하세요.
```

**장점 vs 비용:**
| 장점 | 비용 |
|------|------|
| 문서 누락 방지 | 초기 매핑 테이블 작성 |
| 개발자 경험 개선 | 매핑 유지보수 필요 |
| PR 리뷰 체크리스트 자동화 | 거짓 양성 (관계없는 문서 제시) |

**이 프로젝트 적용 시 추천 방향:**
1. **경량 (추천)**: Hook 없이, PR 체크리스트만 수동으로 추가
2. **중간**: git pre-commit hook으로 "확인하세요" 알림만
3. **완전**: CI/CD에서 diff 분석 → 문서 변경 강제

현재 workspace reset 단계라면, 먼저 문서 구조 정리 후에 설정하는 것이 효율적이다.

**참고 결론:**

- 핵심은 문서를 전부 읽는 것이 아니라 변경 성격으로 owner를 먼저 고르고, 그 owner에서 관련 문서를 따라가는 것이다.
- "code changed → check these docs" 자동화는 이 owner-based 접근을 개발 워크플로우에 통합하는 도구다.
- 이 규칙들은 이후 `docs/guides/workflow.md`에 반영할 수 있는 후보지만, 이 로그 자체는 권위 문서를 대체하지 않는 decided reference다.
- 이 reference는 W4.5 child 로그의 질문 중심 탐색과 W3 guide/workflow 반영 논의에서 참고 자료로 사용할 수 있다.
