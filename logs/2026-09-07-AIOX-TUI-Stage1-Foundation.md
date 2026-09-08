---
topic: AIOX TUI Stage1 Foundation
description: 새 TUI 설계를 domain 패키지 전역 설정 SQLite CLI 기반으로 구현하는 첫 단계
status: decided
---

## Work Items

- [x] W1 Stage 1 기반 구현의 GitHub Actions 3 OS 검증 결과를 확인하고 owner 정합성을 검토한다

## Required Context

### Return Target

- None: independent log.

### {Global}

- plans/aiox-tui-product-rebuild.md Stage 1. docs/aiox-tui-product.md와 새 spec·architecture가 Target 권위다. 이전 src/apps/packages/adapters/tests와 실행·빌드 설정은 사용자 승인으로 삭제했다. 새 foundation부터 구현한다. 과거 실험은 참고이며 기존 파일 보존 의무가 없다. Package log/task 기록을 만들지 않는다.


## 2026-09-07 · 구현 진입 인계

Stage 0 설계 문서 재작성과 이전 미착수 계획 정리는 완료됐다. 이 로그는 다음 재개점을 준비한 것이며 Stage 1 코드 구현은 아직 시작하지 않았다.

첫 행동: 새 runtime/host/collaboration spec과 aiox-system architecture의 신원·단일 소속·routing 책임을 읽고 새 workspace/package 기반을 작성한다. domain의 작은 첫 시나리오와 검증을 정한 뒤 구현한다. 전역 설정 형식과 SQLite native 설치·3 OS 경계는 같은 Stage에서 다루며 모든 미래 모델을 선설계하지 않는다.

사용자의 fresh rebuild 확정과 삭제 승인으로 옛 Stage 3 PTY/stream·milestone Web을 포함한 기존 구현은 제거했다. 아래 읽기 리뷰는 삭제 결정 이전의 경위이며 보존 지시가 아니다.

### 2026-09-07 23:31 · 구현 전 legacy 삭제 범위 읽기 리뷰

사용자 요청으로 서브에이전트 3명에게 현재 git 변경의 package/task 기록, server/protocol/test, Web/test 삭제 범위를 나눠 읽기 검토시켰다. 추가 요청인 plans/aiox-web-first-rewrite.md도 확인했다. 이번은 삭제 실행이 아닌 후보 검토이며 제품 코드·테스트·계획·기존 증거 파일은 변경하지 않았다.

검토 제안: G2 controlling+tasks 11개와 Web-first Stage3 controlling+tasks 6개는 옛 운영 지시를 제거할 수 있다. Stage3 미커밋 diff에만 있는 실제 PTY/resize/detach·출력 실측과 jsdom/mock 한계를 최소 요약한 뒤 삭제하는 편이 좋다. 옛 Web-first/G2 plan은 새 계획으로 대체됐고 자체 유일 실측 근거가 없어 함께 삭제 후보다. 연결된 old target snapshot과 inbound도 같은 삭제 단위에서 정리한다. 지금 삭제한 것은 아니다.

Web Open shell 시연 UI, runtime을 종료하지 않는 force 안내, fragment 없으면 aiox open을 요구하는 bootstrap은 새 계약과 충돌한다. PTY raw byte/resize/cleanup, detach와 실행 종료 분리, xterm binary 처리 메커니즘은 새 구조에서도 필요하므로 선택적 재사용 후보다. 현재 caller가 있다는 사실은 유지 의무가 아니라 삭제 시 함께 정리할 범위다.

root 직접 확인: scripts/check-workspace-boundaries.mjs는 이전 apps/server·packages/database·adapters/* 목록을 고정한다. tests/workspace/package-entry-boundaries.test.ts는 domain 등을 export {};로 강제하므로 새 package/domain 구현과 함께 이 scaffold assertion을 제거/교체해야 한다. root package scripts/bin도 src legacy CLI를 실제 실행하므로 git diff의 새 파일만 지우는 것은 legacy 제거가 아니다. 기존 코드의 유지·삭제를 아직 실행하거나 테스트하지 않았다.

### 2026-09-07 23:34 · 사용자 정정 — fresh rebuild 기준의 Git 변경 재검토

사용자가 기존 구현을 점진적으로 보수하는 것이 아니라 새로 만드는 작업임을 다시 명시했다. 앞 리뷰의 저수준 재사용 제안을 현재 파일 보존 의무로 해석하지 않는다. 기존 caller·통과 테스트·구현 비용은 유지의 자동 근거가 아니다. 새 계약을 기준으로 필요한 기능을 새 책임에서 구현하며 과거 코드는 선택적 참고다.

Subagent 3명에게 git tracked diff와 untracked 전체를 다시 분담 검토시켰다. 직접 집계는 122항목(수정38·삭제46·untracked38)이며 이전 production/test/config 변경은 39항목이다. 새 docs/README/새plan/기준선/Stage1 기록과 사용자 research 자료를 이전 구현 산출물과 구분한다. 기존 코드 변경 철회만으로 fresh rebuild가 되지 않는다. HEAD에도 root src CLI와 옛 workspace 구조가 남으므로 실제 구조 제거 범위를 별도로 다뤄야 한다.

이번 요청은 검토이므로 삭제·restore·production/test 변경은 실행하지 않았다. 이 기록은 앞 유지 중심 제안의 정정이며 실제 삭제 처리는 아직 미실행이다.

### 2026-09-07 23:39 · 승인된 기존 구현·계획 정리 완료

사용자의 실행 승인에 따라 미커밋 변경만 HEAD로 되돌리는 대신 기존 production/test/package 골격을 제거했다. src69·apps32·packages23·adapters6·tests89의 tracked219파일과 이전 milestone untracked21파일, 합계240파일을 삭제했다. old tsconfig2·Vitest config·고정 workspace guard4파일과 해당 빌드 산출물도 제거했다. root package의 legacy bin/scripts/dependencies를 제거하고 onramp·test:workflow만 남겼다. workspace glob은 목표 apps/*, packages/*, packages/adapters/*로 바꾸고 lockfile은 pnpm install --lockfile-only --offline --ignore-scripts로 재생성했다. 아직 새 앱/package 구현은 없다.

Subagent가 옛 G2·Web-first Stage0/3 controlling/task, Local Gateway 설계 로그, old plan2개, accepted-target/W6 architecture/source-ledger를 포함한29파일과 빈디렉터리6개를 삭제했다. 이전 Stage1/2 기록과 G2 Kickoff 등의 직접참조5파일은 과거 경위로 정정했다. 새 설계·현재 plan/log·README와 research-idea, architecture.excalidraw, ignored legacy 개인자료 및 독립 spikes 실험은 보존했다. spikes는 제품 빌드/테스트 대상이 아니다.

과거 Codex binding의 두 코드/test 경로는 docs/architecture/aiox-vendor-bindings.md에서 Git commit 8db476bad722717bf82cc598904f3f33af8a90b3의 재현 가능한 git show 참조로 전환했다. README는 실행 가능한 제품이 아직 없음을 명시한다. 신규 package/task 로그나 compatibility fallback은 만들지 않았다.

삭제 전 Stage3 기록에서 선택 보존한 근거(기존 agent 수용 기록이며 이번 재실험 아님): Darwin arm64/Node24.14의 plain-shell PTY/WS 실측이다. 두 Control/Terminal 연결의 observer·writer 전환, resize·detach·Control disconnect 뒤 PTY 생존을 확인했다. 실제111×37 resize/App unmount 뒤 생존은 확인했지만 Fit은 seam으로 실제 브라우저 glyph/layout·FitAddon DOM 검증이 아니다. pressure는 실제 PTY와 deterministic sink의 실험이며 실제 느린 브라우저 성능이나 새 threshold 계약으로 승계하지 않는다.

검증 완료: workflow13개 통과, onramp가 새 plan Stage1/W1 선택, git diff --check 통과, 삭제 roots/legacy entry 부재·새 docs wikilink 실재·Markdown inline-code 검사 통과, lockfile importer는 빈 root만 남음. 제품 구현을 지웠으므로 제품 build/test 성공을 주장하지 않는다. 처음 inline 검증 명령의 괄호 오타는 수정 후 재실행해 통과했다.

다음 행동은 새 domain과 package 기반의 첫 시나리오 구현이다. 이전 파일 복구나 old plan 재개를 선행하지 않는다.

### 2026-09-07 23:40 · 설계 재작성·legacy 제거 커밋 요청

사용자가 정리 결과의 커밋을 요청했다. 새 설계/README/plan/기준선과 현재 로그, 기존 구현·설정·문서 삭제 및 관련 역사 참조 정정을 한 커밋으로 묶는다. 독립 research-idea 미추적4파일과 개인 자산은 포함하지 않는다. 기존에 staged 변경은 없었고 diff whitespace 검사 통과를 확인했다. workflow13개와 문서/진입 정합 검사는 직전 정리 단계에서 통과했으며 제품 구현은 아직 없는 상태다. 커밋 이후 다음 행동은 Stage1 새 기반 구현이다.

### 2026-09-07 23:48 · Stage 1 구현 위임과 Stage 2 대기 로그

사용자가 Stage 1 작업을 subagent에게 지시하도록 요청해 stage1_foundation에게 실제 구현을 맡겼다. 첫 작업은 W1의 새 domain 신원·단일 Network·directed route와 필요한 TypeScript/test/package 기반이다. root는 결과를 리뷰하고 이 로그를 관리한다. 담당 agent는 rootmanifest/lock/workspace/test-tooling 및 packages/domain을 작성하며 커밋·푸시·package/task 로그 생성은 하지 않는다.

첫 검증 뒤 설정·SQLite·CLI 기반으로 이어가는 Stage 1 순서를 검토한다. domain 첫 작업만으로 Stage 1 완료 처리하지 않는다. 현재는 위임 상태이며 구현·테스트 결과는 아직 수용하지 않았다.

별도 사용자 요청으로 logs/2026-09-07-AIOX-TUI-Stage2-Daemon-MCP-Terminal.md를 일반 로그로 준비해 plan의 대기 Stage 2에 연결했다. 필요한 위치/시점에 라이브러리를 설치하는 방향과 미선정 후보·플랫폼 검증 경계를 기록했다. 현재 활성 단계는 계속 Stage 1이며 Stage 2 구현이나 라이브러리 설치를 이번 기록 준비로 실행하지 않았다.

### 2026-09-08 00:07 · Stage 1 통합 구현 및 사용자 도구 규칙 반영

사용자 지시로 Stage 1을 config·persistence·CLI 서브에이전트에 나눠 구현하고 root가 domain과 공통 도구 및 통합 검사를 담당했다. packages/domain의 단일 Network·directed route·outbound discovery, packages/config의 전역 JSON 읽기·검증·원자적 저장·reload 상태, packages/persistence의 SQLite migration·persistent network/route 저장, apps/cli의 명령 파싱·doctor를 구현했다. daemon/vendor/Web 실행은 아직 구현하지 않았으며 해당 CLI 작업은 명시적으로 unavailable 처리한다.

사용자 확정 규칙을 AGENTS.md에 반영했다: 패키지별 @/* → ./src/* 별칭, tsup 빌드와 tsc 타입 검사, Vitest 사용, production 옆의 TypeScript test 파일. 기존 JS test source를 제거했다. 실제 설치 버전은 TypeScript 5.9.3, tsup 8.5.1, Vitest 4.1.6, better-sqlite3 12.11.1, Commander 14.0.3이다. TypeScript 7에서 tsup 선언 빌드가 실패해 5.9.3으로 조정했다.

최신 사용자 요청의 formatter는 제공된 schema에 따라 Prettier 대신 oxfmt 0.66.0이며 oxlint 1.81.0을 함께 설치했다. .oxfmtrc.json, .oxlintrc.json, .vscode/settings.json에 요청한 값을 반영했다. VS Code source.fixAll.eslint 값도 요청대로 유지했다. pnpm lint, lint:fix, format, format:check와 통합 check를 추가했다. formatter 범위는 새 apps/packages 및 도구 설정으로 제한해 개인 자산을 건드리지 않는다.

직접 검증: pnpm check가 lint, format check(42파일), 네 workspace 타입 검사, tsup ESM/DTS 빌드, Vitest 26개(domain6/config8/persistence5/CLI7) 모두 통과했다. CLI 오류 출력은 잘못된 인자를 거부하는 테스트의 예상 출력이다. CLI --instruction 값 자체가 --인 경우를 delimiter와 혼동하던 문제도 수정 후 포함했다. macOS arm64 Node24에서 SQLite native 설치와 테스트를 확인했으며 Windows/Linux 실측은 아직 없다. 따라서 Stage 1 전체 완료를 선언하지 않는다.

다음 재개: 구현 범위와 owner 문서·Work Items를 최종 대조하고 3 OS 검증 경계를 정리한다. config reload에서 최초 CLI port override와 다음 실행용 파일 port의 표시 의미는 daemon 통합 시 명확히 한다. Stage 2는 계속 대기다. 신규 package/task 로그, 커밋, 푸시는 하지 않았다.

### 2026-09-08 12:00 · ponytail-review 기반 빌드 설정 정리

사용자 요청으로 이번 Stage 1 신규 구현 diff(42 files, apps/packages/tsup.config.ts 등)에
`ponytail:ponytail-review`를 돌려 과잉설계 관점만으로 점검했다. 제품 로직(domain 규칙,
config 검증기, SQLite migration)은 지적 대상이 아니었고, 지적은 전부 빌드/테스트 설정
중복·미사용 옵션에 한정됐다.

주요 지적: (1) 4개 패키지의 `vitest.config.ts`가 byte-identical, (2) `packages/config`·
`packages/persistence`의 `tsconfig.json`이 byte-identical, (3) `packages/domain`·`apps/cli`만
테스트 전용 `tsconfig.test.json`으로 분리하며 `lib: ["ES2022","DOM"]`을 추가했는데 4개 패키지
테스트 전체에 DOM 전용 API 사용이 grep 기준 0건, (4) `apps/cli/src/cli.ts`의 daemon/adapter/
agent/network/host command tree(~200줄)가 `bootstrap.ts`에는 `"doctor"` 하나만 연결돼 있고
나머지는 전부 `"not available"`을 throw함(Stage 2+ 실행부 대기 상태로 보여 순수 판정만 보고,
적용은 보류).

사용자가 (1)(3)은 동의, (2)는 이의 제기했다: TypeScript `extends`의 상대경로(`rootDir`/
`outDir`/`paths`/`include`)는 자식이 아니라 그 값이 적힌 파일 기준으로 해석되므로, 이 값들을
공유 base로 옮기면 각 패키지의 `src`가 아니라 저장소 루트 기준 경로를 가리키게 된다. 이 지적을
검증 없이 수용하지 않고 TypeScript `extends` 경로 해석 규칙을 직접 재확인해 타당함을 확인했고,
남은 `lib`/`types`/`declaration` 일치도 두 독립 패키지의 우연한 일치이지 반드시 지켜야 할
불변이 아니라고 판단해 (2)는 보류(현행 유지)로 접었다. (3)은 domain만 다시 세분화했다:
`types: []`(production) vs `types: ["node"]`(test) 경계가 `docs/architecture/aiox-system.md`
L156-157("domain은... Node/PTY/SQLite/React/vendor SDK에 의존하지 않는다")과 직접 연결되고,
`types: []`는 ambient global뿐 아니라 `@types/node`가 통째로 빠지므로 명시적 `node:*` import도
막는 실질적 가드임을 확인해, domain의 tsconfig.test.json은 유지하고 DOM만 제거했다. CLI는
production tsconfig가 이미 `types: ["node"]`라 경계가 없어 test-only config를 없애고 메인
tsconfig에 흡수했다.

적용: 루트 `vitest.config.ts` 신설(`root`/`alias`를 `import.meta.url` 대신 `process.cwd()` 기준으로
바꿔 pnpm이 각 패키지 디렉터리에서 스크립트를 실행하는 전제에 맞춤 — 별도로 domain/config
디렉터리 각각에서 같은 공유 config로 vitest를 직접 실행해 서로의 테스트를 침범하지 않고 정확한
개수만 잡는지 실측 확인함), 4개 패키지 `vitest.config.ts` 삭제 및 각 `package.json`의 `test`
스크립트를 `vitest run --config ../../vitest.config.ts`로 통일, 루트 `lint`/`format`/`format:check`
스크립트에 `vitest.config.ts` 포함. `packages/domain/tsconfig.test.json`에서 `"DOM"` 제거.
`apps/cli/tsconfig.test.json` 삭제, `apps/cli/tsconfig.json`의 test exclude 제거, `apps/cli/
package.json` typecheck를 단일 `tsc -p tsconfig.json --noEmit`으로 축소.

검증: `pnpm lint`/`format:check`/`typecheck`/`build`/`test` 전부 통과, 테스트는 이전과 동일하게
26개(domain6/config8/persistence5/cli7) 통과. `packages/config`·`packages/persistence`의
tsconfig.json 중복과 `apps/cli/src/cli.ts`의 미구현 command tree는 이번에 손대지 않았다 — 전자는
근거 부족으로 기각, 후자는 Stage 2 실행부 연결 여부에 달려 있어 별도 판단이 필요하다.

### 2026-09-08 13:44 · Stage 1 CI 구성과 선택적 커밋 준비

사용자 지시로 Stage 1 구현 및 공통 빌드 설정과 GitHub Actions를 함께 커밋한다. 기존 staged skill 삭제 3건과 research-idea 개인 자료는 이번 커밋에서 제외한다. 새 package/task 로그는 만들지 않는다.

.github/workflows/ci.yml은 push·pull_request·수동 실행에 Ubuntu/Windows/macOS × Node 20/22/24의 9개 job을 구성한다. pnpm은 packageManager의 10.33.0을 사용하고 frozen lockfile 설치 후 pnpm check와 빌드 CLI doctor를 실행한다. 하나의 실패가 나머지 OS 검증을 취소하지 않도록 fail-fast를 끈다. Actions 공식 저장소 문서와 GitHub tag API로 checkout v7/setup-node v7/pnpm action-setup v6를 확인하고 해당 SHA로 고정했다. .gitattributes의 LF 규칙은 Windows checkout과 oxfmt의 endOfLine: lf를 맞춘다.

직접 재검증: macOS arm64 Node24.14.0에서 pnpm check(26개 테스트, ESM/DTS 빌드 포함)와 빌드 CLI doctor가 통과했다. CI YAML oxfmt와 git diff --check도 통과했다. 원격 Actions는 아직 실행하지 않았으므로 Windows/Linux 또는 Stage 1 전체 완료를 주장하지 않는다. 다음은 root가 저장소 push 후 9개 job의 실제 결과를 확인하는 것이다.

앞 entry의 types: [] 설명 정정: 자동 포함되는 ambient type package 범위를 제한하는 옵션이며 명시적 node:* import 금지까지 독립적으로 보장하는 정책으로 취급하지 않는다. Domain의 플랫폼 의존 금지는 별도 의존성 리뷰 대상이다.

### 2026-09-08 14:03 · Node 하한 확정과 3 OS CI 재실행

사용자가 Node 20 지원을 필수로 두지 않기로 결정하고 Node >=22.12.0 선언과 CI Node22/24 검증에 동의했다. 루트와 apps/cli package.json의 engines를 >=22.12.0으로 통일하고 CI에서 Node20을 제외했다. README는 설치 하한과 실제 검증 범위(3 OS × Node22/24)를 구분한다. 이후 모든 Node 버전의 동작 보장은 아니다. better-sqlite3 12.11.1과 lockfile은 유지했다.

확인 근거: 첫 CI 34188197685는 빌드 전 typecheck 때문에 dist 타입 선언을 찾지 못했고, bfdcb07에서 build→typecheck로 수정했다. 다음 CI 34188446784는 Node22/24의 Windows/Linux/macOS 6개 모두 성공했고 Node20 3개만 install에서 실패했다. Node20.20.2용 better-sqlite3 prebuild가 없고 node-gyp도 없었다. 공식 v12.10.0 release는 Node20/23 prebuild 제거를 명시한다: https://github.com/WiseLibs/better-sqlite3/releases/tag/v12.10.0 . SQLite 자체의 OS 미지원이 아니라 드라이버 배포 조건이다.

현재 변경에 대한 커밋 전략: 이미 staged된 design-grounded-changes skill 삭제 3건, 기존 research-idea 자료 4개, Node/CI/README 및 현재 로그 갱신을 각각 분리한다. 사용자 기존 로그 entry 삭제는 유지하고 개인 architecture.excalidraw는 건드리지 않는다. 조사 자료는 기존 내용을 보존하며 현행 제품 spec으로 승격하지 않는다.

로컬 확인: CI=true pnpm install --frozen-lockfile, pnpm check(lint/format/build/typecheck/Vitest 26개), built CLI doctor 모두 macOS arm64 Node24.14.0에서 통과. 새 6개 조합 CI는 push 후 결과 확인 예정이다. Stage1 전체 종료와 owner 정합성 검토는 아직 완료 처리하지 않는다.

### 2026-09-08 16:33 · Stage 1 완료와 Stage 2 포인터 전환

사용자 요청으로 Stage 1을 완료 처리한다. 커밋 2db827f의 GitHub Actions 34189231508에서 Windows/Linux/macOS × Node22/24 여섯 조합이 모두 성공했다: https://github.com/lunaxislu/aiox-prototype/actions/runs/34189231508 . 설치·lint·format·build·typecheck·26개 테스트·built CLI doctor가 검증 범위다. Node 요구는 >=22.12.0이며 모든 미래 버전의 검증을 의미하지 않는다.

완료 산출물은 domain의 단일 Network/route, config JSON·기본 포트·load/save/session, persistence의 SQLite Network/Route·migration·transaction, CLI parser/doctor와 모노레포 개발 도구다. configuration-web 및 storage-terminal owner에 구현된 선택과 3 OS 근거를 반영해 후보/미검증으로 남던 표현을 정리했다. Stage 1 범위의 남은 작업은 없다.

daemon 실행부·credential/MCP·PTY·최소 Web은 원래 Stage 2 범위다. config CLI port override의 실제 연결, reload의 다음 실행용 포트 의미와 DB 기본 경로 연결도 Stage 2에서 통합한다. runtime 상태는 관측 producer가 생길 때 구체화한다. Host/Worktree·운영 Web·vendor/WSL·npm 배포는 각 후속 단계에 남는다. Stage 2 W1을 다음 재개 지점으로 활성화하며 구현은 이번에 시작하지 않았다.
