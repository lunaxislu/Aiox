# aiox A2A — Federation / Remote (§8)

> 컨텍스트: [[aiox-a2a]] 인덱스. 상태 어휘·layer model·glossary는 인덱스가 소유한다.

## 8. Federation / remote

aiox는 local-first로 시작하지만, protocol contract는 location-ready하게 둔다.

**Status: Current for same-daemon local addressing and local socket control-plane
transport; Deferred/Target for same-machine multi-daemon, remote and federation
implementation.** No `src/` federation/remote implementation files are present as
of this assimilation pass (`find src -iname '*federation*' -o -iname '*remote*'`
returns no matches).

이 protocol contract는 다음 범위로 커져도 깨지지 않아야 한다:

1. **Same daemon local**: 같은 machine, 같은 daemon 안에서 agent끼리 대화한다.
2. **Same machine multi-daemon**: 같은 machine 안의 project/profile별 daemon이 서로
   주소화될 수 있다.
3. **Local-remote**: local daemon과 remote daemon 사이에서 agent가 대화한다.
4. **Company internal federation**: 회사 내부망의 team/project/org 경계를 정책으로 다룬다.
5. **Remote-remote**: remote daemon끼리 public/private transport로 대화한다.

위 목록은 구현 순서가 아니라 protocol contract가 보존해야 하는 확장 범위다. 높은 범위의 기능은 낮은
범위의 protocol contract를 깨지 않는 additive extension으로만 추가한다.

Principles:

- A2A envelope/route는 location-neutral하게 둔다.
- A2A protocol은 OS transport를 몰라야 한다. Unix domain socket, Windows named pipe,
  TCP loopback 같은 선택은 transport 구현 detail이다.
- local socket path나 process 위치를 canonical message identity로 박지 않는다.
- address/identity는 URI-like extension 가능성을 보존한다.
- local/remote 차이는 transport와 identity 계층이 처리한다.
- remote/federation 구현은 defer한다.
- **Committed transport direction:** protocol은 transport를 모르지만,
  reference runtime의 선택은 기록한다 — **거리마다 다른 transport, 같은 protocol**:
  ① 로컬 제어 평면(CLI↔daemon) = UDS 유지 + Windows는 named pipe(Node `net` 모듈
  동일 API, 전환 지점은 [[src/daemon/socket-transport.ts]] 주석에 표시됨. TCP loopback은
  차선 — 포트 충돌·로컬 다중 사용자 접근 제어 약함·Windows 방화벽 팝업).
  ② agent ingress = vendor 표면이 결정(MCP stdio/HTTP loopback/WS) — 선택권 없는 층.
  ③ daemon↔daemon(L1 사내망/L2 remote) = WebSocket over HTTPS + token/mTLS
  (`ws` 의존성 기보유, tunnel — tailscale/cloudflared — ·프록시 친화).
  ④ 자체 TCP 바이너리 프로토콜은 만들지 않는다.
- **Exploratory sequencing:** remote 확장 후보 순서는 **L2 → L1 → L3**다. L2는
  모바일/원격 client가 지원하는 connector와 secure tunnel을 이용해 local aiox MCP
  surface에 도달하는 가설이다. 실제 mobile client 지원 범위, 인증, background lifecycle,
  user consent를 spike하기 전에는 "신규 프로토콜 없이 가능" 또는 제품 기능으로 약속하지
  않는다. L1은 사내망 daemon federation, L3는 외부 vendor 또는 A2A Protocol bridge이며 외부
  integration surface 의존성이 더 크다. 전부 동시에 진행하지 않는다.

Current implementation caveat: the local control plane is implemented with a
Node `net` socket server/client around a resolved socket path
(`src/daemon/socket-transport.ts:48-85`), but daemon-to-daemon WebSocket/token/mTLS,
remote registration, signed envelopes and replay protection remain deferred.

Deferred federation topics:

- remote daemon registration
- daemon-to-daemon auth
- signed envelope
- replay protection
- ordering/retry
- partial failure policy
- company SSO/mTLS/public federation/cloud relay
- remote capability marketplace
