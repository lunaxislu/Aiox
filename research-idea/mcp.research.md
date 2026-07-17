https://www.linkedin.com/posts/jyoung105_mcp-%ED%94%84%EB%A1%9C%ED%86%A0%EC%BD%9C%EC%9D%B4-7%EC%9B%94-28%EC%9D%BC%EC%97%90-%EC%99%84%EC%A0%84%ED%9E%88-%EB%B0%94%EB%80%9D%EB%8B%88%EB%8B%A4-release-candidate-share-7465178125644238848-m7Lx/?utm_source=social_share_send&utm_medium=ios_app&rcm=ACoAAEvyYy0BdAN4y30cdCZnsUw99Wxq8uUSi5A&utm_campaign=share_via

```text
MCP 프로토콜이 7월 28일에 완전히 바뀝니다

Release Candidate: https://lnkd.in/gKUQesDN

소프트웨어가 헤드리스 구조로 나아가는 과정에서 가장 중요한 개념은 MCP 입니다. ChatGPT, Claude 등에 연결하여 사용하는 Connector 가 해당 MCP 구조를 요구하기 때문입니다.

하지만 MCP 서버를 원격(remote)으로 운영해본 분은 아실 겁니다.
보통 sticky session 걸고 session store 공유하고 load balancer 설정까지 건드려야 합니다.

하지만 7월 28일부터 이 구조가 전부 바뀝니다.
프로토콜 자체가 stateless 로 전환돼요.

소프트웨어 업계 사람에게 매우 중요한 이야기입니다.
달라지는 점을 8가지로 정리했습니다.

① initialize/initialized handshake 가 삭제됩니다

프로토콜 버전과 client info 는 이제 매 요청 _meta 에 담겨서 갑니다.
서버 capabilities 가 필요하면 server/discover 를 호출하면 돼요.
기존에는 initialize → initialized 두 단계를 거쳐야 첫 요청을 보낼 수 있었는데 이 과정 자체가 없어집니다.

② Mcp-Session-Id 도 사라집니다

세션 ID 가 없으니 요청이 어떤 서버 인스턴스에 떨어져도 처리 가능합니다.
sticky session 과 session store 가 필요 없어져요.
round-robin load balancer 하나면 충분합니다.

③ 상태가 필요하면 explicit handle 패턴을 사용하세요

프로토콜 세션이 사라졌다고 stateful 앱을 못 만드는 건 아닙니다.
서버가 basket_id 같은 handle 을 발급하고 모델이 다음 호출에 argument 로 넘기면 돼요.
오히려 모델이 handle 을 tool 간에 넘겨가며 추론할 수 있어서 세션 기반보다 유연합니다.

④ server-to-client 요청 방식이 달라집니다

기존에는 SSE 스트림을 열어두고 서버가 클라이언트에 요청을 보냈습니다.
이제는 서버가 InputRequiredResult 를 반환하고 클라이언트가 inputResponses 와 requestState 를 담아 재요청하는 구조예요.
모든 상태가 payload 안에 있으니 어떤 인스턴스가 받아도 처리됩니다.

⑤ Mcp-Method 와 Mcp-Name 이 필수 헤더입니다

load balancer 나 gateway 가 body 를 열지 않고도 라우팅할 수 있게 됩니다.
거기에 ttlMs 와 cacheScope 가 추가돼서 tools/list 같은 응답 캐싱도 가능해졌어요.
W3C Trace Context 전파도 스펙에 정식 포함됩니다.

⑥ Extensions 가 독립 프레임워크로 올라갑니다

extension 마다 reverse-DNS ID 를 부여하고 코어 프로토콜 버전과 독립적으로 버저닝합니다.
공식 extension 으로 MCP Apps(서버 렌더링 UI) 와 Tasks(비동기 장시간 작업) 가 포함돼요.
특히 Tasks 는 2025-11-25 실험 버전에서 lifecycle 이 완전히 재설계됐으니 반드시 기존 구현에 대해 마이그레이션이 필요합니다.

⑦ Roots, Sampling, Logging 은 deprecated 대상입니다

Roots 는 tool parameter 나 resource URI 로 대체하고 Sampling 은 LLM provider API 를 직접 연동하는 방식이 됩니다.
Logging 은 stdio 에서는 stderr, 나머지는 OpenTelemetry 로 전환이에요.
당장 삭제는 아니고 최소 12개월 유예 기간이 있습니다.

⑧ 인증 스펙이 OAuth/OIDC 기준으로 강화됩니다

인증 응답에서 iss 파라미터 검증이 필수가 돼요.
Dynamic Client Registration 시 application_type 선언도 추가됩니다.
데스크톱이나 CLI 클라이언트가 web 으로 기본 분류돼서 localhost redirect 가 거부되던 문제도 해결됩니다.

⚠️ 이번 발표는 다소 과격한 변동 사항이 포함됩니다

Release candidate 는 5월 21일에 잠겼고 최종 스펙은 7월 28일에 나옵니다. Tier 1 SDK 는 10주 안에 지원 구현이 필요해요.
에러 코드도 -32002 에서 JSON-RPC 표준 -32602 로 바뀌니 literal matching 하는 코드가 있으면 미리 수정해두세요.

소프트웨어가 점점 headless 구조로 가고 있고 AI 가 외부 도구와 통신하는 표준인 MCP 의 중요성은 더욱 높아질 것입니다.

그런 점에서 이번 stateless 전환은 단순한 스펙 업데이트가 아니라 MCP 를 일반 HTTP 인프라 위에서 돌릴 수 있게 만드는 전환점이에요.
그래서 7월 28일 전에 한번 훑어두면 좋겠습니다.

꼭 필요한 AI 정보를 지속적으로 업로드하고 있습니다.
저와 "1촌"이 되면 유용한 정보를 놓치지 않을 거에요.
```

![alt text](image.png)
