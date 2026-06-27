# aiox Product

Related:

- [[docs/specs/aiox-a2a]]
- [[docs/architecture/local-agent-runtime]]
- [[docs/product/roadmap]]

Status: Current

이 문서는 aiox의 제품 목적, 사용자, 범위와 제품 원칙을 소유한다. Protocol contract, 내부
runtime 구조, release 순서와 실행 task는 각각 specs·architecture·roadmap·plans가 소유하며
여기에 복사하지 않고 링크한다.

## Product Definition

**aiox는 agent 간 협업을 위한 versioned communication protocol을 정의하고, 그 reference
implementation으로 cross-vendor local-first daemon/runtime을 제공한다.**

- **Protocol:** vendor와 실행 위치에 종속되지 않는 agent 협업 의미를 정의한다. 상세 contract는
  [[docs/specs/aiox-a2a]]가 소유한다.
- **Reference runtime:** protocol을 현재 사용 가능한 agent runtime에 연결한다. 현행 내부 구조는
  [[docs/architecture/local-agent-runtime]]가 소유한다.

aiox는 자체 protocol과 reference implementation이며, public interoperability standard로
포지셔닝하지 않는다.

## User Value

Primary user는 한 workspace에서 Codex와 Claude 같은 장기 실행 CLI agent를 함께 사용하며,
agent 사이의 위임·토론·결과 회신을 사람이 복사하거나 중계하지 않고 연결하려는 개발자다.

초기 제품이 해결하는 jobs-to-be-done:

- agent를 이름으로 등록하고 directed route 또는 pair로 연결한다.
- 다른 agent에게 요청을 보내고 원 요청에 연결된 회신을 받는다.
- target이 준비되지 않아도 delivery 상태와 실패 이유를 확인한다.
- daemon, agent, route, message와 delivery 상태를 점검하고 개입한다.
- vendor별 CLI·plugin·session 차이를 격리하면서 protocol 의미를 유지한다.

## Scope

aiox의 초기 제품 경계는 **cross-vendor local collaboration**이다. 사용자가 이미 사용하는 서로
다른 vendor의 장기 실행 CLI/TUI agent를 하나의 local control plane 아래에서 연결하고,
vendor별 session·ingress·egress 차이는 adapter가 흡수한다.

Single-vendor 내부 협업은 각 vendor의 1st-party 기능이 담당하므로 aiox의 핵심 차별점으로 삼지
않는다. aiox는 서로 다른 vendor의 agent가 공통 협업 의미를 유지하며 함께 작동하는 범위에
집중한다.

## Product Principles

### Control-plane Authority

**State와 policy authority는 control plane에 잔류한다.** Agent runtime이 protocol을 native로
지원하더라도 canonical identity, routing, delivery와 policy authority는 daemon에 남는다.
Native 지원은 agent가 protocol을 일급으로 사용한다는 뜻이며, authority가 agent로 이동한다는
뜻이 아니다.

### Adapter-first Adoption

Vendor 협약이나 vendor-native 지원이 없어도 aiox는 adapter 기반 제품으로 성립한다. 제품 가치는
vendor의 공식 surface를 aiox가 connector로 연결하는 데서 시작한다.

- **aiox-owned:** aiox가 vendor의 공식 surface 위에 connector를 구현한다.
- **upstream-enabled:** vendor가 안정적인 integration surface를 제공하면 aiox adapter가 이를
  protocol에 연결한다.
- **vendor-native:** vendor runtime이 protocol을 직접 지원한다.

Upstream-enabled와 vendor-native는 선택 가능한 발전 경로이며 초기 제품의 필수 전제가 아니다.
연결 방식, capability tier와 degradation contract는 [[docs/specs/aiox-adapter-model]]이 소유한다.

### Terminal-first Interaction

aiox는 사용자가 이미 사용하는 vendor-native CLI/TUI를 primary interaction surface로 유지한다.
협업 기능을 제공하기 위해 기존 terminal experience를 aiox-owned terminal emulator로 대체하지
않는다. Terminal session 배치와 비자동 환경 fallback의 contract 및 도입 순서는
[[docs/specs/aiox-compose-contract]]와 [[docs/product/roadmap]]이 소유한다.

## Product Direction

[Status: Target] 아래는 현재 scope를 넘어서는 승인된 목표 방향이다. 구체 contract, 내부 설계와
단계 순서는 각각 specs·architecture·roadmap이 소유한다.

- **Declarative collaboration topology:** project의 agent 협업 topology를 선언으로 구성한다.
  Docker Compose와 유사한 사용 모델을 참고하지만 container, service와 replica orchestration은
  제품 범위가 아니다. Contract는 [[docs/specs/aiox-compose-contract]]가 소유한다.
- **Local-first remote expansion:** local collaboration에서 시작해 remote와 federation으로 확장할
  수 있는 방향을 보존한다. 확장 contract는 [[docs/specs/aiox-federation-remote]]가 소유한다.

## External Positioning

A2A는 외부 agent interoperability standard이고, aiox의 primary focus는 사용자가 이미 쓰는
CLI/TUI agent를 연결하는 local-first runtime과 control plane이다. 외부에서는 aiox를
**cross-vendor local agent collaboration runtime**으로 설명하고, Linux Foundation A2A와 경쟁하는
새 standard로 표현하지 않는다. 외부 interoperability가 필요해지면 A2A는 bridge 대상이 될 수 있다.

> [!warning] 외부 공개 표현 주의
> "A2A"는 Google이 Linux Foundation에 기증해 vendor-neutral 거버넌스로 호스팅되는 Agent2Agent
> Protocol의 확립된 명칭이다(last verified 2026-06-27). 외부 표면에서 "A2A standard를
> 정의한다"고 하지 않고 위 자기소개를 사용한다. `a2a`를 일반명사로 쓸 때도 혼동 가능성을
> 확인하고, protocol·package·repository 이름은 공개 직전에 다시 검증한다.

Sources:

- [Google Cloud donates A2A to Linux Foundation](https://developers.googleblog.com/en/google-cloud-donates-a2a-to-linux-foundation/)
- [A2A Protocol adoption update, April 2026](https://www.linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year)
