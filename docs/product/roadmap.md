# Product Roadmap

> **상태: provisional — plan-side draft/input (최종본 아님)**
> 이 문서는 workspace reset W3-2에서 `plans/` 실행 plan으로부터 추출한 plan-side 입력만 담는다.
> 최종 roadmap은 W4-4에서 아래를 통합해 확정한다(**통합 pending**):
> - 이 plan-side draft (`plans/post-mvp.plan.md` Sequenced/Candidates)
> - `prd/post-mvp/aiox-a2a-spec.md` §11 Release roadmap (게이트·phase)
> - `prd/post-mvp/aiox-a2a-spec.md` §12 공개 전 결함 단계 매핑
> - `plans/release-plan.md` G6 packaging 실행 plan 연결

이 문서는 제품 scope 안에서 추진할 방향, 우선순위와 순서를 소유한다. 구현 checklist를
대신하거나 제품 scope를 확장하지 않는다. 상세 실행 계획(trigger·scope·cutover·checklist)은
`plans/post-mvp.plan.md`와 각 sub-plan이 소유한다.

`plans/release-plan.md`는 roadmap 항목이 아니라 `prd/post-mvp/aiox-a2a-spec.md` §11 G6
npm packaging gate의 실행 plan이다(배포 시점 패키징 체크리스트). roadmap은 추진 순서만
가리키고, 패키징 게이트의 owner는 spec §11 G6과 그 실행 plan인 release-plan이다.

출처: `plans/post-mvp.plan.md` §Sequenced, §Candidates (plan-side draft).

## 구현 추진 순서

1. **Local single-daemon A2A**: 같은 project, 같은 daemon 안에서 A2A envelope/lifecycle을
   먼저 안정화한다. `plans/post-mvp/envelope-metadata.plan.md`가 kickoff entry point이고,
   Codex structured metadata spike는 text fallback의 한계를 줄일 수 있는지 병행 확인한다.
2. **Adapter/runtime connector**: Codex/Claude vendor 분기를 adapter registry와 runtime
   connector model로 정리한다.
3. **Capability + instruction projection**: agent별 MCP/tool/skill/instruction 주입과
   instruction precedence를 구현한다.
4. **Compose**: agents/routes/capabilities/policies/instructions를 선언형 desired state로
   올린다. terminal 자동 배치는 core가 아니라 recipe/plugin 후보로 둔다.
5. **Same machine multi-daemon**: project/profile별 daemon namespace와 local transport를
   다룬다. Windows named pipe 또는 TCP loopback 같은 transport 예시는 이 단계의 구현
   후보이며, 1~4단계에서는 그런 transport 차이가 나중에 들어와도 막히지 않게 유지한다.
6. **Local-remote 이후**: remote daemon registration, daemon-to-daemon auth, internal
   federation, remote-remote federation은 deferred다.

## 구현 후보 (Candidates)

현재 등록된 deliverable과 우선순위:

| Deliverable | Sub-plan | 우선순위 / 상태 |
| --- | --- | --- |
| A2A envelope/lifecycle migration | `plans/post-mvp/envelope-metadata.plan.md` | **Next kickoff** — Local single-daemon A2A v1 안정화 |
| Codex structured metadata spike | `plans/post-mvp/codex-structured-metadata-spike.plan.md` | 병행 조사 후보 — text fallback 한계 검증 |
| Adapter dispatch registry refactor | `plans/post-mvp/adapter-dispatch-registry.plan.md` | deferred — 순서 2 |
| Channel server boot failure surface | `plans/post-mvp/channel-boot-surface.plan.md` | deferred — 순서 2 |

## Cross-Platform Requirement

Windows/Linux/macOS 호환은 별도 후반 단계가 아니라 1~4단계에 계속 걸리는 조건이다.
상세 불변식은 `prd/post-mvp/aiox-a2a-spec.md`가 소유한다.

- **1단계 — A2A envelope/lifecycle**: transport-neutral protocol.
- **2단계 — Adapter/runtime connector**: OS launch/shell/path/signal 차이 흡수.
- **3단계 — Capability + instruction projection**: OS path resolver와 symlink/copy fallback.
- **4단계 — Compose**: OS-neutral config, OS-specific 처리는 compiler/recipe/plugin에서.
