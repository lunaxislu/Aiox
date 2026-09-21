---
topic: yaml-extension
description: AIOX Host YAML의 VS Code·Cursor 작성 지원 범위와 확장 구현 방식 논의
status: open
---

## Work Items

- [x] W1 구현된 VS Code·Cursor 확장의 전체 검사와 최종 VSIX 설치 검증을 마치고 결과·Cursor 미검증 범위를 인계한다.
- [>] W2 Cursor 환경에서 동일 VSIX와 Red Hat YAML을 설치해 두 파일 패턴 및 다섯 기능을 실검증한다. 현재 환경에는 Cursor가 없어 미검증이다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 작성 지원 범위는 aiox.yaml과 aiox.*.yaml이다. 시각화·시각적 편집은 후속이며 실행·운영 연동은 제외한다.
- 독립 로그다. Stage 3 작업의 이관이나 Stage 5 구현 착수를 뜻하지 않는다. 사용자의 구현 요청에 따라 IDE 확장을 구현했으며 최신 검증 기록에서 완료 범위와 남은 일을 확인한다.
- 첫 버전 기능은 필드·값 자동완성/설명, 구조 검사, Agent 참조 자동완성, 참조·라우팅 오류 검사, Agent 정의로 이동이다. Agent 이름 일괄 변경은 후속이다.
- custom.yaml 등 임의 파일의 수동 연결 명령·설정 저장은 제외한다. Host CLI의 --path 계약은 변경하지 않는다.
- YAML 규칙은 docs/specs/aiox-host.md의 최신 Host 입력 schema와 적용 snapshot을 따른다. version 금지, routing/default optional(기본 allow), host.instruction optional(기본 빈 문자열), 확장 후 중복 edge 오류다. 이전 로그의 상반된 제안은 2026-09-21 Git 변경 대조 entry로 교정됐다.
- 지원 대상은 VS Code·Cursor이며 packages/IDE/vscode에 구현한다. Red Hat YAML과 VS Code API 직접 연결을 사용하고 별도 AIOX LSP 서버는 도입하지 않는다. 다른 편집기는 후속 미정이다.
- 자동 인식 파일명은 aiox.yaml 및 aiox.*.yaml이다. 스키마와 AIOX 전용 기능 모두 같은 패턴에 적용한다. 앞선 aiox.yaml만 지원한다는 범위는 이 결정으로 갱신하며 임의 파일 수동 연결은 계속 제외한다.
- 사용자의 구현 요청에 따라 packages/IDE/vscode에 확장을 구현했다. 이전 미착수 기록은 구현 entry로 갱신한다. 현재 VS Code 실제 검증은 통과했고 Cursor는 미검증이다. 사용·설치 안내는 패키지 README, 계약은 Host spec, 내부 경계는 System architecture를 따른다.

## 2026-09-21 · 작성 지원 범위와 구현 방식 논의

사용자는 AIOX Host YAML용 VS Code 확장의 구현 방식을 논의하려고 했으며, 처음에는 로그를 기록하지 말라고 요청했다. 이후 이번 대화 내용을 `yaml-extension`이라는 파일명으로 기록하도록 명시적으로 요청했다. 이 요청에 따라 독립 Base 로그를 생성한다. 별도 task lifecycle이나 공동 검증 산출물 관리가 필요한 단계가 아니므로 package log는 만들지 않는다.

### 사용자 의사와 범위

- 사용자는 제시된 세 방향 중 1번인 YAML 작성 지원을 먼저 하고, 2번인 Agent 연결 시각화·시각적 편집은 나중에 하겠다고 밝혔다.
- Host 실행·종료·실제 상태 표시 등 운영 연동은 이번 작성 지원 제안에 포함하지 않았다.
- 현재 요청은 논의 내용을 기록하는 것이다. 구현 착수, 배포 방식, 세부 기능 전체에 대한 개별 확정으로 확대 해석하지 않는다.

### 제안한 구현 방식

Red Hat YAML 확장과 작은 AIOX TypeScript 확장을 조합한다.

```text
VS Code에서 aiox.yaml 편집
├─ Red Hat YAML + JSON Schema
│  └─ 필드·값 자동완성, 설명, 문법·구조 검사, 포맷
└─ AIOX TypeScript 확장
   └─ Agent 참조 자동완성, 정의로 이동, 참조·라우팅 오류 검사
```

```text
파일 열기 / 저장 전 내용 수정
→ 현재 편집 내용 분석
→ 구조 및 분석 가능한 참조·라우팅 검사
→ 자동완성·설명·오류 밑줄·Problems 갱신
```

AIOX 전용 기능은 제안 범위이며 세부 수용 기준은 아직 정하지 않았다. 작성 지원은 daemon 없이 동작시키고, 별도 Language Server는 처음부터 도입하지 않는 방향을 제안했다. 이후 Host 실행부와 의미 검증을 공유해 편집기와 CLI 판정 차이를 줄이는 것도 제안이며, 현재 공유 모듈이 구현됐다는 뜻은 아니다.

### 확인한 근거와 미결 사항

- [Host 명세](../docs/specs/aiox-host.md)는 `Committed target`이다. Agent 정의, Network 소속과 directed routing을 소유하며, 일부 YAML 규칙은 Open/deferred다. 확장이 미결 규칙을 임의로 확정해서는 안 된다.
- [CLI 명령 선언](../apps/cli/src/cli.ts)에 Host 명령 표면이 있고, [CLI bootstrap](../apps/cli/src/bootstrap.ts)의 `unavailable` 함수에 Host 기능의 Stage 5 미구현 안내가 있다. 선언된 명령을 실행 지원 완료의 근거로 삼지 않는다.
- [Red Hat YAML 공식 문서](https://github.com/redhat-developer/vscode-yaml)의 `yamlValidation`을 통한 스키마 연결과 [VS Code 언어 기능 API](https://code.visualstudio.com/api/language-extensions/programmatic-language-features)를 앞선 논의에서 확인했다. 실제 확장 연동·동작은 아직 검증하지 않았다.
- 확정·미결 YAML 규칙 목록, 진단 위치·메시지, 참조 완성·정의 이동의 세부 동작, 파일 식별 범위, 설치·배포 방식과 검증 기준은 후속 논의 대상이다.

### 논의 중 설명 정정

에이전트는 처음 위 조합을 권한 뒤, 사용자의 “할 것이 맞나?”라는 질문에 스키마부터 제공하고 전용 확장은 나중에 만들자는 착수 순서를 제안했다. 사용자가 원래 제안의 의미를 다시 묻자, 에이전트는 작성 지원을 구현할 때 권하는 구성은 Red Hat YAML + 작은 TypeScript 확장이 맞다고 정정했다. 따라서 “전용 확장은 만들지 않는다” 또는 “지금 바로 구현한다”를 사용자 결정으로 기록하지 않는다.

이번 기록에서는 기존 Stage 3·Stage 5 로그와 plan을 변경하지 않았다. 다음 논의는 Work Items의 W1에서 재개한다.

### 2026-09-21 12:11 · 첫 버전 작성 지원 다섯 기능 확정

사용자는 첫 버전에 다음 다섯 기능을 포함하자는 제안에 “그래”라고 동의했다.

1. 필드·값 자동완성과 설명
2. 필수값 누락·잘못된 타입 등 구조 검사
3. Agent 참조 자동완성
4. 없는 Agent 참조·상충하는 라우팅 선언 검사
5. Agent 정의로 이동

Agent 이름 변경 시 참조 전체를 수정하는 기능은 후속으로 둔다. 기존 시각화·시각적 편집 후속 및 Host 실행·운영 연동 제외 범위를 유지한다. 이전 entry의 AIOX 전용 기능이 제안 단계라는 상태는 위 다섯 기능의 포함 여부에 한해 이번 승인으로 갱신한다. 세부 수용 기준과 구현 착수는 아직 확정하지 않았다.

후속 대조에서 Host 명세의 routing.default 생략값, 동일 edge·동일 값 중복 처리, version의 정식 schema 여부와 공통 YAML validation 세부가 미결임을 확인했다. 다만 [Stage 5 Host 로그](2026-09-09-AIOX-TUI-Stage5-Host.md)의 2026-09-21 11:36 기록에 Host 경로·adapter 표기 등 후속 결정이 있으므로 명세의 미결 표기만 보고 이미 결정한 항목을 재질문하지 않는다. 다음에는 그 최신 기록과 명세를 함께 대조해 실제 미결 규칙을 제시한다. 파일 식별은 기본 aiox.yaml 외 사용자 지정 YAML도 실행 입력이 될 수 있다는 계약을 고려해야 한다.

### 2026-09-21 12:12 · 사용자 지정 파일 연결 제외

사용자는 custom.yaml 등 임의 이름의 파일을 명령 팔레트로 AIOX Host 설정에 연결하는 제안을 설명받은 뒤 “굳이 지원안해도됨”이라고 밝혔다. 첫 버전은 기본 파일명 aiox.yaml에 자동 적용하고, 사용자 지정 파일 연결 명령·연결 경로 저장 기능은 제외한다.

이는 VS Code 작성 지원의 적용 범위 결정이다. Host CLI가 --path로 사용자 지정 YAML을 읽는 계약을 제거하거나 변경하는 결정은 아니다. 앞선 entry에서 사용자 지정 YAML 지원을 고려 대상으로 남긴 내용은 이번 결정으로 정리한다. 다섯 작성 지원 기능의 포함 범위는 유지한다.

### 2026-09-21 12:14 · YAML 검증 규칙 구체안 제안

사용자가 다음 단계의 구체안을 요청했다. Host 명세와 Stage 5의 2026-09-21 결정을 대조했다. YAML adapter의 claude 표기는 Stage 5에서 이미 결정됐으므로 과거 명세 예시의 claude-code를 그대로 채택하지 않는다. 아래는 사용자 승인 전 제안이며 Host 계약의 확정이나 코드 구현 결과가 아니다.

- 기본 구조: version: 1, host.name, 비어 있지 않은 agents, 정확히 하나의 networks 항목을 필수로 제안한다. 각 Agent의 adapter는 claude 또는 codex이며 필수, role/description/instruction/args와 host.layout은 선택으로 제안한다. args 생략 시 빈 배열·문자열 배열 규칙은 기존 명세를 따른다.
- 라우팅 기본 정책: routing.default를 필수로 두고 allow/deny를 직접 선택하게 제안한다. 생략 시 암묵적 정책을 만들지 않아 통신 가능 범위를 파일에서 판별할 수 있다. allow/deny 목록은 선택이며 생략은 빈 목록으로 제안한다.
- 참조: Network agents에는 선언된 Agent만, route에는 해당 Network 참여 Agent만 허용한다. 모든 선언 Agent가 Network에 참여할 필요는 없게 제안한다. 자기 자신을 향한 route는 오류로 제안한다.
- route 형식: from(Agent 이름 하나)+to(비어 있지 않은 Agent 이름 배열) 또는 between(서로 다른 Agent 둘 이상) 중 하나만 허용하는 구체안을 제안한다. between은 자기 자신을 제외한 양방향 edge로 확장한다.
- 중복: 같은 edge에 allow/deny가 함께 있으면 기존 명세대로 오류다. 같은 정책의 edge 중복은 의미를 한 번만 적용하고 경고로 표시하는 안을 제안한다. Network 참여 목록 및 between/to 목록 안의 같은 이름 중복은 오류로 제안한다.
- 오타: 고정 필드의 알 수 없는 키와 중복 YAML key는 오류로 제안한다. Agent/Network 이름을 받는 map key는 고정 필드 검사와 구별한다. 이름 문법의 추가 제한은 이번 제안에서 확정하지 않는다.

작성 중에는 저장 없이 현재 문서 내용으로 갱신하고, 문법 오류 때문에 해석 불가능한 부분에서 파생되는 참조 오류는 억제하는 동작을 제안한다. 확정된 다섯 기능과 aiox.yaml 적용 범위는 유지한다. 위 구조·기본값 제안은 확장만의 독자 규칙으로 구현하지 않고, 승인 시 Host 명세에 반영할 계약으로 다룬다. 이름 문법·layout 세부 및 YAML 특수 문법 처리는 구현 전 후속 확인이 필요하다.

### 2026-09-21 17:39 · Git 변경의 최신 Host schema 반영과 optional 필드 교정

사용자는 정책이 변경됐으므로 Git 변경을 확인하도록 지시했고, routing.default와 Host global instruction은 optional이며 추론 가능하게만 지원하면 좋겠다고 밝혔다. git status, diff/stat 및 Host spec·Stage5 로그와 Runtime/System의 관련 변경을 확인했다. 이번 확인은 working tree의 문서 계약이며 Host production 구현 완료를 의미하지 않는다.

최신 [Host spec](../docs/specs/aiox-host.md)의 「Host 입력 schema와 적용 snapshot」 기준:

- root 필수는 host/agents/networks다. version은 schema에 없고 알 수 없는 키는 거절한다. 이전 version: 1 필수 제안은 폐기한다.
- routing 자체와 routing.default는 optional이다. default 생략값은 allow, allow/deny 목록 생략값은 []다. 이전 default 필수 제안은 사용자 지시 및 최신 owner와 맞지 않아 폐기한다.
- Host global instruction의 실제 필드명은 host.instruction이며 optional, 생략값은 빈 문자열이다. Host 공통 instruction 다음에 비어 있지 않은 Agent instruction을 빈 줄 하나로 잇는다. 공통 협업 지침의 vendor별 합성은 vendor-bindings owner를 따른다.
- 확장 후 중복 directed edge는 같은 정책이어도 금지한다. 이전 동일 정책 중복을 경고만 하자는 제안은 폐기하고 오류로 맞춘다.
- Network membership은 중복 없는 선언 Agent의 부분집합이며 빈 목록도 유효하다. 이름·null·YAML tag·layout 등 세부 검증도 최신 schema를 기준으로 한다.

“추론 가능”의 확장 동작 해석·제안: optional 필드를 누락 오류로 표시하거나 파일에 강제로 삽입하지 않는다. 필드 자동완성과 설명에서 선택 여부·생략값을 알 수 있게 하고, networks.<name>.routing 또는 Network 정의 hover에서 기본 정책 allow와 그 근거(생략값)를 안내한다. host hover에서는 공통 instruction 미지정과 Agent별 instruction의 적용 관계를 안내한다. 이것은 설정으로부터 유효값을 설명하는 제안이며 Agent 역할이나 문맥으로 지침 문장을 생성하거나 allow/deny 목록을 보고 default를 바꾸는 기능을 뜻하지 않는다. hover 제공 위치·표현은 아직 세부 제안이다.

최신 owner가 이미 두 optional 계약을 소유하므로 이번에는 owner 문서·타 작업 로그·코드를 수정하지 않는다. 남은 작업은 미결 정책을 새로 만드는 것이 아니라 최신 schema에 맞춘 다섯 작성 기능의 세부 동작·검증 기준을 정리하는 것이다.

## 2026-09-21 · 편집기 지원 범위와 모노레포 배치

사용자는 확장 패키지를 별도 저장소가 아닌 현재 모노레포의 packages/IDE 아래에 두도록 방향을 제시했다. 이후 VS Code·Cursor·Windsurf, IntelliJ IDEA·WebStorm, Zed의 여섯 편집기를 지원 대상으로 논의했고 에이전트는 공통 언어 서버와 계열별 연결 플러그인을 제안했다. 사용자는 이 논의를 기록하도록 요청했다.

사용자가 기존의 “VS Code만 지원하면 별도 언어 서버가 필요 없다”는 설명과 차이를 물어, 에이전트는 LSP가 필수 조건이 아니라 여러 편집기에서 기능을 공유하기 위한 제안임을 설명했다. 이어 사용자는 “우선 vscode의 vscode와 cursor만 해보자”라고 현재 범위를 좁혔다.

현재 유효한 범위:

- 우선 지원 대상은 VS Code와 Cursor다. Windsurf·IntelliJ IDEA·WebStorm·Zed는 이번 구현·검증 범위에서 제외하며 후속 착수는 정하지 않았다.
- packages/IDE를 편집기 지원의 상위 디렉터리로 둔다. 첫 확장 위치로 packages/IDE/vscode를 제안한다. 별도 저장소는 만들지 않는다.
- Red Hat YAML + JSON Schema로 기본 YAML 작성 지원을 제공하고, 작은 TypeScript 확장이 VS Code API를 직접 사용해 AIOX 참조 자동완성·진단·정의 이동을 제공하는 구성을 따른다.
- 별도 AIOX 언어 서버는 도입하지 않는다. Red Hat YAML이 내부적으로 사용하는 언어 서버와는 구분한다. 앞서 제안한 language-server/jetbrains/zed 디렉터리를 미리 만들지 않는다.
- aiox.yaml 대상 다섯 기능, optional 기본값 설명, 시각화·실행 연동·사용자 지정 파일 연결 제외는 유지한다.
- 동일 확장으로 두 편집기를 지원하되 Red Hat YAML 연결, 자동완성·진단·정의 이동은 양쪽에서 실제 확인해야 한다. 현재 호환 검증이나 구현은 수행하지 않았다.

이전 조사 근거: [VS Code 언어 기능 API](https://code.visualstudio.com/api/language-extensions/programmatic-language-features), [Red Hat YAML](https://github.com/redhat-developer/vscode-yaml), [Cursor 확장 안내](https://prod.cursor.com/help/customization/extensions). Cursor 배포 경로는 Open VSX 기반이므로 VS Code Marketplace 게시만으로 Cursor 배포 완료라고 간주하지 않는다. 배포 방식과 최소 지원 버전은 아직 미정이다.

이번 기록은 확장 코드 구현·파일 구조 생성·배포가 아니다. 다음에는 최신 Host schema와 기존 구현을 대조해 첫 패키지 구성 및 두 편집기의 기능 검증 경로를 구체화한다.

## 2026-09-21 · 자동 인식 파일명 패턴 확장

사용자는 스키마 연결이 aiox.yaml뿐 아니라 aiox.*.yaml도 지원해야 한다고 지시했다. 자동 인식 대상을 aiox.yaml 및 aiox.*.yaml로 확장한다. 예: aiox.dev.yaml, aiox.production.yaml. 스키마 연결과 AIOX 전용 자동완성·진단·정의 이동에 동일한 파일명 패턴을 적용해야 한다.

앞서 제외한 custom.yaml 등 임의 이름 파일의 수동 연결 명령·설정 저장은 계속 제외한다. 이번 결정은 정해진 파일명 패턴의 자동 인식 확대이며 임의 파일 연결 기능의 재도입이 아니다. .yml 지원은 이번 지시에 포함되지 않는다. 기존 aiox.yaml만 지원한다는 기록은 이번 결정으로 갱신한다. 코드 구현과 편집기 실검증은 아직 수행하지 않았다.

## 2026-09-21 · VS Code·Cursor 확장 구현과 검증

사용자가 구현을 요청해 packages/IDE/vscode를 추가했다. Red Hat YAML 스키마 연결과 source range를 보존하는 YAML AST 기반 참조 자동완성·진단·정의 이동·기본값 hover를 구현했다. aiox.yaml 및 aiox.*.yaml에만 적용하며 daemon·별도 AIOX LSP 서버 없이 동작한다. 루트 workspace와 tsup 빌드에 새 패키지를 연결했다. 기존 타 작업 변경은 유지했다.

확인: 현재 packages/config에는 Host layout 검증 일부만 있고 재사용할 Host YAML parser/Zod schema는 없다. 사용자의 Ajv 질문에 대해 Zod는 기존 protocol/MCP에서 사용 중이나 이번 Ajv는 배포 JSON Schema의 dev-only 테스트 용도임을 설명했다. 실행 bundle은 yaml 파서를 포함하고 vscode만 외부 API로 사용한다. @vscode/vsce는 로컬 VSIX 패키징용 개발 의존성이다.

현재 검증: 인접 Vitest 24개, 확장 tsc --noEmit, tsup 빌드, 루트 lint/format 통과. 따옴표 이름, 불완전 배열, alias 참조·재귀 데이터, 정확한 진단 위치, 중복/충돌/self/member 검사와 schema optional·금지 필드·layout을 확인했다. 격리된 실제 VS Code 1.135.0 + Red Hat YAML 1.24.0에서 두 파일 패턴의 schema 진단, 참조 완성, 정의 이동, default hover, 저장 전 참조 오류·이전 진단 제거가 통과했다. 실행 script와 결과는 /private/tmp/aiox-ide-smoke/smoke.cjs, result.json이다. 사용자 VS Code 설정·설치 확장은 변경하지 않았다.

VSIX 패키징을 한 차례 통과했으며 최종 전체 검사 후 다시 생성한다. Cursor는 설치가 확인되지 않아 실제 실행 검증은 남아 있다. 전체 pnpm check의 첫 실행은 Web Vite module 링크 부재로 중단됐다. pnpm install --frozen-lockfile로 workspace 링크를 복구하고 재실행 중이다. 전체 검사 성공이나 Cursor 실검증 완료로 아직 보고하지 않는다.

Host spec에 IDE 작성 범위, System architecture에 책임·진단 수명·의존성 경계를 연결하고 패키지 README에 설치/개발/검증 방법과 Cursor 미검증 상태를 남겼다. 다른 Stage 로그나 plan은 변경하지 않았다.

### 2026-09-21 18:07 · 최종 검사와 설치 산출물 검증 완료

전체 caffeinate -i pnpm check가 exit 0으로 완료됐다. lint/format/build/typecheck와 49개 파일·663개 테스트가 통과했으며, 확장 자체는 2개 파일·24개 테스트다. 근거: /private/tmp/aiox-ide-check.log. 첫 실행의 Vite 링크 문제는 frozen-lockfile 설치로 복구됐고 재실행에서 해소됐다.

최종 packages/IDE/vscode/dist/aiox-yaml.vsix를 생성해 격리 VS Code 프로필에 설치했다. 개발 소스 경로 대신 설치된 확장으로 테스트하여 두 파일 패턴, Agent 자동완성·정의 이동, optional default hover, 저장 전 진단과 stale 제거, schema 오류·enum 자동완성, custom.yaml 제외를 확인했다. 결과: /private/tmp/aiox-ide-smoke/packaged-result.json, passed:true, VS Code 1.135.0. Red Hat YAML은 1.24.0이다. bundle·schema·README·manifest가 VSIX에 포함되고 Ajv/테스트/개발 의존성은 포함되지 않는다.

사용자 기본 편집기 프로필에는 설치하지 않았으며 Marketplace/Open VSX에 게시하지 않았다. 설치는 README의 Extensions: Install from VSIX 절차로 가능하다. Cursor는 실제 설치 환경 부재로 미검증이며, 호환 지원 목표와 실제 검증을 구분한다. 구현 및 현재 환경에서 가능한 검증은 완료했고 Cursor 검증을 W2로 남긴다. Host parser의 의미 검증 공유는 후속 Host 구현이 생길 때 대조할 사항이며 현재 공유된 구현이 있다고 주장하지 않는다.

### 2026-09-21 22:41 · 확장 작업만 선택 커밋 준비

사용자가 이번 에이전트 작업만 커밋하도록 요청했다. 확장 패키지, workspace/tsup 설정, 해당 의존성 lockfile, 이 로그와 Host/System 문서의 IDE 작성 지원 절만 선택한다. 두 owner 문서에 섞인 Stage5 등 타 작업 변경은 포함하지 않는다. Host spec의 IDE 절은 기존 aiox.yaml 절 앞에 배치해 별도 작업의 미커밋 추가 절과 독립적으로 stage할 수 있게 했다. 기존 실행 코드·타 로그·목업·adapter 테스트 변경은 보존한다.

기능 코드는 최종 전체 663개 테스트 및 설치 VSIX 검증 이후 변경하지 않았다. 이번 커밋 준비에서는 선택 diff와 whitespace·로그 구조를 점검한다. VSIX는 ignored dist 산출물이므로 Git에는 소스·빌드/설치 방법을 기록한다. Marketplace 등록·push는 수행하지 않는다.
