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

## References

- 작업 흐름과 사례: `docs/guides/workflow.md`
- plan 구조, 단계 문법과 유지: `plans/AGENTS.md`
- 로그 작성, 재개, 상태와 종료: Claude/Codex log skill
- 로그를 닫을 때의 owner 반영과 repo 전용 추가 점검: `logs/AGENTS.md`
- 로그 도구: `.agents/skills/log/scripts/log`
- 명세(Spec) 작성, 상태 표기, 분할 규칙: `docs/specs/AGENTS.md`
- 내부 구조(Architecture) 작성, drift 판정 원칙: `docs/architecture/AGENTS.md`
- 결정(Decision) 작성, 승격 기준, history 원본 처리: `docs/decisions/AGENTS.md`
