# Runtime 지원 범위와 agent CLI 검증 정책

## Context

aiox는 native dependency와 MCP runtime을 사용하며, 현재 dependency 조합은 임의의
Node 20 이상 버전을 동일하게 지원하지 않는다. 또한 Codex CLI와 Claude CLI의
upstream surface는 빠르게 바뀌므로 장기 고정 버전만으로 actual compatibility를
보장할 수 없다.

공개 전 release 인증 범위를 줄이면서도 사용자가 재현 가능한 runtime 조합을 판단할 수
있게, 지원 OS·Node 범위와 agent CLI 검증 방식을 함께 정해야 했다. 이 결정의 release
outcome은 [[docs/product/roadmap]] G0와 G4가 소유한다.

## Decision

공식 지원 OS는 macOS와 Linux로 한정한다. 지원 Node 범위는 `20.19.x`, `22.12.x 이상인
22.x`, `24.x`로 둔다. WSL2는 공식 지원 및 release 인증 대상에서 제외하며, 포함은 별도
범위 변경 결정이 필요하다.

Codex CLI와 Claude CLI에는 장기 고정 버전 지원을 약속하지 않는다. G0는 매월 검증 기준
버전과 환경을 기록하고, version/capability preflight 및 supported fallback 또는 명시적
실패 posture를 구현·검증한다.

## Alternatives

- **WSL2를 macOS/Linux와 함께 즉시 공식 지원한다.** Windows-host와 Linux guest의 경로,
  권한, process lifecycle 조합까지 release 인증 범위가 넓어진다.
- **Node `>=20` 전체를 지원한다.** Node 21과 현재 dependency가 허용하지 않는
  Node 20·22 patch 범위까지 지원한다고 오해하게 된다.
- **Codex/Claude의 특정 버전을 장기 고정한다.** 재현은 단순하지만 upstream의 월별 변화와
  실제 capability 변화에 대응하지 못한다.

## Rationale

macOS와 Linux는 aiox의 local daemon·CLI runtime을 release 인증하기 위한 두 공식 Unix
환경이다. WSL2는 별도 host/guest 경계와 운영 조건을 더하므로, 실제 clean-host evidence
없이 공식 지원 범위에 포함하지 않는다.

Node 범위는 현재 MCP, CLI, native SQLite dependency와 test toolchain이 함께 허용하는
LTS major·patch 기준으로 제한한다. 이 범위를 `package.json`과 CI에 동일하게 적용하면
설치 가능 범위와 검증 범위가 갈라지지 않는다.

agent CLI는 버전 문자열만으로 required ingress·MCP capability를 판단할 수 없다. 월별
검증 기준, runtime preflight와 fallback/명시적 실패를 결합해야 unsupported upstream
변화를 지원 완료 주장으로 오인하지 않는다.

## Trade-offs

- WSL2 사용자는 공식 지원과 release gate 보장을 받지 않는다.
- Node 21·23과 지원 범위 밖 patch는 동작할 수 있어도 지원 주장이나 release evidence로 쓰지 않는다.
- 월별 agent CLI 검증과 preflight 구현·유지는 지속적인 운영 비용이다.

## Re-evaluation

WSL2 clean-host evidence와 유지 가능한 CI 비용이 확보되거나, native dependency·toolchain의
Node 지원 범위가 바뀌면 지원 matrix를 재검토한다. Codex 또는 Claude가 안정된 versioned
integration contract를 제공하면 월별 검증 정책과 fallback posture도 다시 판단한다.

## Sources

- `package.json`과 `pnpm-lock.yaml` — 현재 runtime·native dependency·test toolchain의 Node engines.
- `logs/2026-07-10-G1-A-contractingress-freeze.md` — G0 지원 범위와 agent CLI 정책의 사용자 결정.
