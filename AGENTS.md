architecture.excalidraw는 사용자의 개인 자산임 신경쓸 필요가 없음

## Evidence And Reporting

- 확인한 사실, 추론, 의견과 제안을 구분해서 보고한다.
- 확인하지 않은 추론을 사실처럼 설명하거나 주장하지 않는다.
- 파일, 로그, 명령 출력에서 직접 확인하지 않은 내용은 근거와 불확실성을 함께 밝히고,
  필요한 경우 먼저 확인한다.
- 사용자의 직접적인 지시나 타 에이전트(aiox 등)의 의견 및 분석 결과를 무조건 수용하지 않는다. 에이전트 자체 분석상 타당하지 않거나 충돌이 의심되는 경우, 명확한 근거(확인한 사실, 추론, 의견의 구분)를 기반으로 논리적인 이의 제기 및 대안을 제시한다.
- 사용자가 해당 도메인 모델에 익숙하지 않아 설계·작업 흐름의 결정을 요청하면, field나 구현 선택부터 승인받지 않는다. 먼저 부분의 책임과 결합을 tree 또는 composition map으로, 상태·처리 순서를 짧은 ASCII flow로 보여 준 뒤 사용자 시나리오와 UI·이벤트·실패 흐름에 연결한다. 그 다음 선택지의 관찰 가능한 결과, 장단점과 근거를 구분해 제시하고 결정을 요청한다. 사용자가 밝힌 기술 배경은 설명의 출발점으로 적용하되, 개인 맥락은 현재 작업 로그에만 기록한다.

## Work Entry

- 현재 작업, 토론, 질문과 Work Items는 `logs/`의 주제별 open 로그에 기록한다.
- 독립된 큰 workstream의 단계 순서와 단계 로그 포인터만 `plans/`가 소유한다.
- 현재 작업 선택과 재개는 `scripts/onramp`의 출력과 `docs/guides/workflow.md`의
  절차를 따른다.
- 현재 작업의 권위는 선택된 open 로그의 최신 기록, Work Items와 next pointer에 있다.
- onramp 출력이 복수 후보, 깨진 pointer, 순환, 복수 활성 단계처럼 하나로 정해지지
  않는 상태를 보고하면 추측하지 않고 사용자에게 선택을 요청한다.
- 작업 전 현재 할 일, 읽을 범위와 진행 방식을 짧게 보고한다.
- 문서나 코드를 읽거나 추가·수정·삭제·개편할 때는 국소 파일만 보고 멈추지 않는다.
  관련 owner 문서, inbound/outbound 링크, 호출 경로, producer/consumer, tests와
  decision/spec/architecture 연결을 끝까지 추적해 영향 범위와 검증 경로가 닫혔는지 반드시
  확인한다. 실제 절차와 사례는 `docs/guides/workflow.md`를 따른다.

## Design And Implementation

- 사용자 entry부터 상태 생성·관측·전달·소비 경로와 완료·실패 조건을 먼저 확인한다.
  서버가 상태를 관측하는 것과 사용자 화면에 전달하는 것을 구분한다.
- 기존 구현의 존재를 필요성의 근거로 삼지 않는다. polling·호환 처리·추가 상태는 현재 요구와
  실제 caller/consumer의 필요를 확인한 뒤 선택하며 불필요한 경로는 유지하지 않는다.
- 자원 생성 성공을 작업 성공으로 간주하지 않는다. 실행 전 확인 가능한 선행 조건을 검증하고,
  이후 실제 실행 실패와 서버 진단이 사용자에게 전달되는지 확인한다.
  확인한 요구 위반을 플랫폼 한계로 기록하는 것만으로 작업을 완료하지 않는다.

## Development Database Before First Release

- 첫 배포 전에는 과거 개발 DB 호환을 보존하지 않고 현재 schema·code·tests를 직접 수정한다.
  기존 spec·architecture의 migration 서술을 근거로 과거 DB를 보존하는 명시적 migration·
  backfill·legacy fallback이나 옛 행만을 위한 nullable을 구현·유지하지 않는다.
  빈 DB를 현재 schema로 직접 초기화하고 저장·조회·재오픈 검증은 유지한다.
- 저장 원자성·실패 재시도·데이터 무결성은 보존한다. 개발 DB 삭제는 사용자 승인 범위에서
  해당 daemon 종료를 확인한 뒤 수행하며, startup 자동 삭제·reset을 추가하지 않는다.
- 사용자가 배포 완료를 알리면 그 시점부터 이후 DB schema 변경은 기존 데이터를 보존하는
  migration으로 수행한다. 배포 여부를 임의로 추정하지 않는다.

## TypeScript Build And Tests

- 각 앱·패키지의 tsconfig에서 `paths: { "@/*": ["./src/*"] }`를 사용한다.
  `@/`는 해당 패키지 내부 source 별칭이며 다른 패키지는 공개 package entry로 import한다.
- 빌드는 tsup, 타입 검사는 `tsc --noEmit`, 테스트는 Vitest를 사용한다.
- lint는 oxlint, 포맷은 oxfmt를 사용하며 루트 `.oxlintrc.json`과 `.oxfmtrc.json`을 따른다.
  별칭이 타입 검사뿐 아니라 테스트와 빌드 후 Node 실행에서도 해석되는지 확인한다.
- 테스트는 대상 production 파일과 같은 디렉터리에 같은 이름으로 작성한다.
  `module.ts` 옆에 `module.test.ts`, `component.tsx` 옆에 `component.test.tsx`를 둔다.
  예: `packages/domain/src/network/route.ts`와 `route.test.ts`.
  앱·패키지 밖의 별도 tests 디렉터리에 대상 파일 테스트를 모으지 않는다.

## References

- 작업 흐름과 사례: `docs/guides/workflow.md`
- plan 구조, 단계 문법과 유지: `plans/AGENTS.md`
- 로그 작성, 재개, 상태와 종료: Claude/Codex log skill
- 로그를 닫을 때의 owner 반영과 repo 전용 추가 점검: `logs/AGENTS.md`
- 로그 도구: `.agents/skills/log/scripts/log`
- 명세(Spec) 작성, 상태 표기, 분할 규칙: `docs/specs/AGENTS.md`
- 내부 구조(Architecture) 작성, drift 판정 원칙: `docs/architecture/AGENTS.md`
- 결정(Decision) 작성, 승격 기준, history 원본 처리: `docs/decisions/AGENTS.md`
