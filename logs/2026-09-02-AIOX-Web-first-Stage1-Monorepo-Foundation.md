---
topic: AIOX Web-first Stage1 Monorepo Foundation
description: Web-first rewrite Stage 1에서 pnpm workspace와 apps packages adapters skeleton 및 shared tooling을 구축한다
status: decided
---

> 이 문서는 이전 Web-first 작업의 완료 증거다. 아래 scope·required reads·plan 상태는 당시 기록이며 현재 실행 지시가 아니다. 당시 구현·테스트는 새 제품에서 재사용되거나 검증됐다는 근거로 자동 승계하지 않는다. 현재 작업은 `plans/aiox-tui-product-rebuild.md`에서 시작한다.

## Work Items
- [x] W1 workspace boundary dependency graph와 root pnpm configuration을 구축한다
- [x] W2 apps cli server web executable skeleton과 entry build boundary를 구축한다
- [x] W3 protocol domain config database adapter-sdk와 built-in adapter package skeleton을 구축한다
- [x] W4 shared TypeScript build test configuration과 recursive orchestration을 구축한다
- [x] W5 dependency direction smoke verification과 architecture owner handoff를 완료한다
- [x] W6 boundary checker의 relative escape와 undeclared workspace package 우회를 차단한다
- [x] W7 각 workspace의 package-local source alias를 @/*로 통일하고 @aiox/* 경계를 보존한다

## Required Context

### Return Target

- None: independent package log.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.
- Project integration: `AGENTS.md, plans/AGENTS.md, logs/AGENTS.md, docs/documentation-system.md`.
- 이전 참조 정리: 해당 선행 target·계약·활성화 지시는 폐기됐다. 이 완료 기록을 재개하지 않으며 현재 구현은 `plans/aiox-tui-product-rebuild.md`를 따른다.
- Current implementation claim은 code와 tests에서 직접 재확인하고 predecessor candidate 변경을 accepted evidence처럼 사용하지 않는다.

## Package Scope

- Revision: 4; History pointer: `2026-09-02 · Stage 1 corrective boundary and alias closeout`.
- Primary boundary: AIOX Web-first monorepo workspace foundation
- Related artifacts in allowed write-set:
  - Root workspace: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`.
  - Workspace artifacts: `apps/{cli,server,web}/**`, `packages/{protocol,domain,config,database,adapter-sdk}/**`, `adapters/{claude-cli,codex-cli}/**`.
  - Verification: `scripts/check-workspace-boundaries.mjs`, `tests/workspace/**`.
  - Architecture handoff: `docs/architecture/web-first-workspace-boundaries.md`, and only the necessary navigation links in `docs/architecture/local-agent-runtime.md` and `docs/architecture/web-first-runtime-lifecycle.md`.
  - Work state: this controlling log, its W1-W7 task records, 당시 Web-first plan(폐기됨), and Stage 2 controlling/task state only when Stage 1 closeout activates Stage 2 W1.
- Excluded:
  - Gateway production RPC, React/Vite runtime projection과 product UI.
  - PTY, WebSocket, SQLite schema 또는 vendor runtime 실행.
  - 기존 `src/**`·legacy tests 삭제/이동과 compatibility forwarding, alias, dual path.
  - Stage 0 lifecycle의 TypeScript field spelling, exact Gateway wire name과 Adapter SDK 상세 계약 확정.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution default: inline. 각 executable W는 Compact task record를 사용하고 accepted 결과 승격 전 controlling result review를 거친다.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - Public protocol, process lifecycle, security, persistence 또는 release claim은 result promotion 전에 independent review 필요성을 재판정한다.
  - Activate when: large claim, public contract/security/data/release, irreversible external effect, multi-owner conflict, large blast radius, or low discovery confidence is present.

## Task Index

- Stable package key: 2026-09-02-AIOX-Web-first-Stage1-Monorepo-Foundation

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W7 | Compact | delegated | `logs/packages/2026-09-02-AIOX-Web-first-Stage1-Monorepo-Foundation/tasks/W7.md` |
| W6 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage1-Monorepo-Foundation/tasks/W6.md` |
| W5 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage1-Monorepo-Foundation/tasks/W5.md` |
| W4 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage1-Monorepo-Foundation/tasks/W4.md` |
| W3 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage1-Monorepo-Foundation/tasks/W3.md` |
| W2 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage1-Monorepo-Foundation/tasks/W2.md` |
| W1 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage1-Monorepo-Foundation/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - Accepted target와 open-decision boundary는 당시 Web-first accepted-target snapshot(폐기됨)가 제공한다.
  - Stage 0 accepted lifecycle·authority 계약과 predecessor의 decided result만 실행 baseline으로 사용한다.
  - W1 discovery에서 legacy root importer를 Stage 9까지 보존하며 새 workspace를 병존시키고, target package로 legacy source를 복사하지 않는 경계를 확인했다.
  - W1 accepted: root와 10개 private workspace project, manifest dependency graph, lockfile importers와 platform-neutral `tsconfig.base.json`이 focused test/install/list 검증을 통과했다.
  - W2 accepted: CLI/server private executable entry와 web browser-neutral entry가 독립 typecheck/build/import를 통과했으며 React/Vite/Gateway behavior는 포함하지 않는다.
  - W3 accepted: five shared packages와 two built-in adapters의 empty public ESM boundaries가 독립 typecheck/build/import와 domain purity test를 통과했으며 deferred API/schema/vendor behavior는 포함하지 않는다.
  - W4 accepted: root legacy와 10개 child의 fail-closed lint/typecheck/build/test orchestration, Node boundary checker, shared compiler config와 nested build-output ignore가 full verification을 통과했다.
  - W5 accepted: boundary checker의 positive/negative/domain manifest/public-name import smoke, isolated frozen install과 full recursive gate, workspace architecture owner handoff가 통과했고 independent final review가 blocker 없음을 확인했다.
- Evidence gaps:
  - Stage 0 lifecycle의 exact TypeScript export spelling은 Stage 1 skeleton 완료에 필요하지 않으며 후속 implementation contract로 남는다.
  - 기존 single-package tests는 legacy current-fact evidence로 유지하고, Stage 1 package boundary는 새 focused smoke가 검증한다.

## Cross-Artifact Effects

- 이 Stage의 primary 구현은 protocol architecture spec tests와 다음 Stage consumer를 함께 변경하거나 재검증한다.
- allowed write-set 밖의 effect는 조용히 적용하지 않고 새 Work Item 또는 후속 Stage handoff로 기록한다.

## Decision Candidates

- N/A.
- Reason: no decision candidate recorded yet.
- Activate when: decision-worthy rationale or competing options appear.

## Verification Contract

- Revision: 2; History pointer: `2026-09-02 · W1 workspace foundation`.
- Required:
  - 기존 `node_modules`를 삭제하지 않는 격리 복사본에서 `pnpm install --frozen-lockfile` clean workspace install.
  - root legacy typecheck/test와 모든 workspace package의 recursive lint, typecheck, build, test.
  - public package export/import smoke와 manifest/source dependency direction audit.
  - domain package의 React, Node process, SQLite, WebSocket과 apps/adapters 역의존 부재.
  - edited docs Markdown inline-code check, Stage 1 log/package-log check, Manual Registry Integrity, `git diff --check`와 실제 diff review.
- Recommended:
  - N/A.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 2; History pointer: `2026-09-02 · W1 workspace foundation`.
- Criteria:
  - pnpm workspace와 apps packages adapters physical boundary가 accepted target과 일치한다.
  - 모든 workspace package가 독립적으로 typecheck build test되고 root orchestration이 이를 재현한다.
  - architecture owner가 dependency direction과 package responsibility를 소유한다.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-09-02 · Stage 1 package bootstrap

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.
- Activation guard: Stage 0와 immediate predecessor가 `decided`이고 plan에서 Stage 1이 `[>]`가 되기 전에는 모든 Work Item을 `[ ]`로 유지한다.
- Task contract: Work Item별 Compact task record를 생성했으며 plan은 이 package의 task·검증·closeout 내용을 소유하지 않는다.

## 2026-09-02 · Stage 0 predecessor 수용과 Stage 1 활성화

- Activation evidence: 당시 Stage 0 계약 기록(폐기됨)가 W1–W5 owner contract와 required verification을 완료하고 `decided`로 전환됐다.
- Plan state: 당시 Web-first plan(폐기됨)에서 Stage 0은 `[x]`, Stage 1은 유일한 `[>]`다.
- Current next: W1 workspace boundary dependency graph와 root pnpm configuration. Production 작업은 새 turn에서 W1 discovery/contract review 후 시작한다.

## 2026-09-02 · W1 workspace foundation

- Discovery facts: HEAD `46e53bd`; onramp는 Stage 1 W1만 활성화한다. 기존 root는 pnpm 10.33.0 단일 ESM package이며 `pnpm-workspace.yaml`, `apps/`, `packages/`, `adapters/`, shared compiler config와 새 boundary test가 없다. Stage 1 구현 경로는 기존 dirty G2/research 변경과 겹치지 않는다.
- Producer/consumer finding: legacy `src/**`는 UDS, pair/compose, daemon API와 old DB schema에 결합돼 있어 새 package로 복사하거나 forwarding하지 않는다. 기존 root package와 `src/**`/tests는 Stage 9 전 legacy validation asset으로 유지한다.
- Accepted dependency graph: `apps/cli`와 `apps/web`은 `packages/protocol`; `apps/server`는 `domain`, `protocol`, `config`, `database`, `adapter-sdk`; `packages/database`는 `domain`; built-in adapters는 `adapter-sdk`에만 의존한다. `domain`, `protocol`, `config`, `adapter-sdk` 사이에 필요가 확인되지 않은 edge는 만들지 않는다.
- Contract correction: W1은 workspace globs, root package metadata/lockfile, 10개 child manifest와 W2/W3 검증에 필요한 최소 `tsconfig.base.json`까지 소유한다. W4는 package scripts/config와 recursive lint/typecheck/build/test orchestration을 완성한다. 새 lint dependency 대신 Node built-in static boundary audit를 사용한다.
- Contract review: exact write-set, commands와 completion evidence를 Package Scope/Verification revision 2와 W1 Brief revision 2로 보정한 뒤 execution에 진입한다. React/Vite product shell, Gateway behavior, DB schema, Adapter SDK field spelling, legacy deletion/compatibility는 제외한다.

### 2026-09-02 14:51 · W1 result review와 수용

- Result review: W1 Brief revision 2 Attempt 1의 실제 manifests, lockfile importers, focused Red/Green test, install output와 diff를 다시 확인했다. Root legacy bin/scripts/dependencies와 `src/**`가 보존되고 accepted graph 밖 workspace edge가 없으므로 candidate를 전체 수용한다.
- Accepted result: pnpm workspace는 root와 10개 private `@aiox/*` project를 발견한다. W1은 workspace identity/dependency graph와 platform-neutral compiler baseline만 고정했고 package source/export와 product behavior는 아직 주장하지 않는다.
- Registry Integrity: package-log check, actual Compact W1-W5 set, Task Index와 record Identity 역포인터가 일치한다.
- Result Consumption Gate: revision 2 Attempt 1 결과, 전체 수용 disposition, downstream W2/W3 재검증 조건과 accepted Evidence 반영이 완료됐다. W1을 완료하고 W2를 활성화한다.

## 2026-09-02 · W2 app entry boundaries

- Accepted predecessor: W1 revision 2 Attempt 1은 root와 10개 private workspace manifest, lockfile graph와 compiler baseline으로 수용됐다.
- Contract choice: Stage 1 app skeleton은 React/Vite, Gateway transport와 CLI command grammar를 구현하지 않는다. `apps/cli`와 `apps/server`는 side-effect 없는 private executable ESM entry, `apps/web`은 side-effect 없는 browser-neutral ESM entry를 제공한다.
- W2 write-set은 `apps/{cli,server,web}/{package.json,tsconfig.json,src/index.ts}`와 `tests/workspace/app-entry-boundaries.test.ts`다. App package build/typecheck와 built-module import가 completion evidence이며 shared lint/test/root orchestration은 W4가 소유한다.
- Contract review: 각 app은 W1 manifest edge를 보존하고 public export를 `dist/index.js`/`dist/index.d.ts`로 제한한다. CLI/server bin은 private package executable boundary만 증명하며 product behavior를 주장하지 않는다.

### 2026-09-02 14:54 · W2 result review와 수용

- Result review: W2 revision 2 Attempt 1의 manifests, tsconfig, source, Red/Green, package builds와 built imports를 재검토했다. Side-effect 없는 entry만 있고 Stage 2 behavior나 forbidden app import가 없으므로 전체 수용한다.
- Registry/Consumption: package-log registry가 통과했고 exact Result, disposition, W1 dependency와 W4 재검증 조건을 소비했다. W2를 완료하고 W3를 활성화한다.

## 2026-09-02 · W3 package and adapter boundaries

- Accepted predecessor: W1 workspace graph과 W2 app entries가 controlling accepted state다.
- Contract choice: five shared packages와 two built-in adapters는 private public-export boundary와 independent compiler boundary만 가진다. All source entries remain empty ESM modules; exact lifecycle symbols, protocol frames, config/DB schema, Adapter Runtime Binding과 vendor behavior를 확정하지 않는다.
- W3 write-set은 `packages/{protocol,domain,config,database,adapter-sdk}/{package.json,tsconfig.json,src/index.ts}`, `adapters/{claude-cli,codex-cli}/{package.json,tsconfig.json,src/index.ts}`와 `tests/workspace/package-entry-boundaries.test.ts`다.
- Contract review: `database -> domain`, built-in adapters -> `adapter-sdk` manifest edge만 유지한다. Domain/shared skeleton에는 Node/DOM ambient types를 넣지 않고 adapters만 Node compiler environment를 갖는다. Package build/typecheck/public import와 forbidden import 부재를 검증한다.

### 2026-09-02 14:58 · W3 result review와 수용

- Result review: W3 revision 2 Attempt 1의 7 manifests/configs/empty sources, Red/Green, independent builds/imports와 domain purity assertion을 재검토했다. Deferred field/schema/vendor behavior가 없고 accepted edges만 남아 있어 전체 수용한다.
- Registry/Consumption: package-log registry가 통과했고 exact Result, W1 dependency, disposition과 W4/W5 재검증 조건을 소비했다. W3를 완료하고 W4를 활성화한다.

## 2026-09-02 · W4 shared tooling orchestration

- Accepted predecessors: W1 workspace/compiler baseline, W2 app entries와 W3 package/adapter entries가 controlling accepted state다.
- Tooling design: root `tsconfig.json`은 shared base를 extend하면서 legacy include/outDir/types를 유지한다. Root wrapper scripts는 legacy root를 먼저 검증한 뒤 pnpm recursive `--sort`로 10개 workspace의 같은 script를 실행한다.
- Lint design: 새 dependency 없이 `scripts/check-workspace-boundaries.mjs`가 package identities, exact manifest edges, public export, required scripts와 source import 방향/domain forbidden dependency를 검사한다. 각 child `lint`는 자기 canonical path를 명시해 같은 checker를 재사용한다.
- Test design: child skeleton은 아직 behavior가 없으므로 `node --test`로 독립 test command의 실행 가능성만 증명하고, root Vitest의 focused workspace tests가 실제 boundary contract를 검증한다. `--if-present`를 사용하지 않아 script 누락이 recursive gate를 실패시킨다.
- W4 write-set은 root `package.json`, `tsconfig.json`, `vitest.config.ts`(필요한 경우), all child manifests, `scripts/check-workspace-boundaries.mjs`, `tests/workspace/shared-tooling.test.ts`다.

### 2026-09-02 15:07 · W4 build output contract correction

- Attempt 1 result review finding: all tooling commands passed, but package builds create 20 nested `dist/*` files that root `.gitignore`의 `/dist/` rule does not ignore.
- Contract revision 3: W4 allowed write-set에 root `.gitignore`를 추가하고 nested `**/dist/` build outputs가 worktree artifact로 남지 않는 조건을 추가한다. This is a build-boundary correction, not product behavior or legacy deletion.
- Revision impact: shared-tooling focused test에 ignore assertion을 먼저 추가하고 failure를 확인한 뒤 `.gitignore`를 보정한다. Existing build/typecheck/test results remain valid, but lint/full status를 재검증한다.

### 2026-09-02 15:10 · W4 result review와 수용

- Result review: W4 revision 3 Attempt 2의 root/child scripts, checker, shared/root tsconfig split, focused Red/Green, generated artifact status와 full command results를 재검토했다. `--if-present`, new dependency, legacy semantic change가 없고 nested dist leak도 닫혀 candidate를 전체 수용한다.
- Environment disposition: sandbox `pnpm check` test stage의 71 failures는 Unix/TCP/WebSocket listen과 `~/.aiox` chmod EPERM에 직접 대응했다. Same source에서 승인 환경 `pnpm test`가 79 files/1012 tests와 10 child commands passed하여 product failure로 수용하지 않는다.
- Registry/Consumption: package-log registry가 통과했고 revision 3 Attempt 2 Result, correction, disposition과 W5 revalidation 조건을 소비했다. W4를 완료하고 W5를 활성화한다.

## 2026-09-02 · W5 dependency verification and architecture handoff

- Accepted predecessors: W1-W4 accepted workspace graph, public empty entries, and recursive tooling are the only Stage 1 implementation baseline.
- Owner identity: `docs/architecture/web-first-workspace-boundaries.md` owns physical workspace composition, package responsibility boundaries, dependency direction, and verification mapping. Runtime lifecycle/state/side-effect ordering remains in `web-first-runtime-lifecycle`; the as-built compatibility index gains navigation only.
- Verification design: exercise the real boundary checker on the current tree, copy a minimal domain package fixture to an isolated temp root and prove a forbidden Node import fails, then import every built package by its manifest public name from its own package directory.
- Clean-install design: copy the repository without `.git`, `node_modules`, or generated `dist` into an isolated temporary directory; run frozen install and the same lint/typecheck/build/test gates there. No existing dependency tree is deleted.
- Contract review: W5 Brief revision 2 fixes the exact write-set and status distinctions. Product APIs, lifecycle field spelling, Gateway/React/PTY/DB/vendor behavior and compatibility code remain excluded.

## 2026-09-02 · W5 result review와 Stage 1 closeout

- Result review: W5 revision 2 Attempt 2의 checker, five focused smoke tests, clean-copy command outputs, architecture owner/status/evidence/navigation과 diff를 재검토했다. Side-effect import와 domain manifest platform dependency Red/Green corrective가 candidate에 포함됐고 independent final reviewer도 implementation blocker가 없다고 확인해 전체 수용한다.
- Verification disposition: isolated frozen install은 11 projects, reused 100, downloaded 0으로 통과했다. Final clean copy에서 lint/typecheck/build가 통과했고 승인 환경 test가 80 files/1017 tests와 10 child commands를 통과했다. Sandbox full-check test failure는 Unix/TCP/WebSocket listen 및 chmod 제한에 대응하며 동일 final source의 승인 환경 pass로 환경 제약으로 판정한다.
- Owner handoff: `docs/architecture/web-first-workspace-boundaries.md`가 physical workspace, target responsibility placement, allowed dependency direction과 verification flow를 소유한다. Runtime lifecycle/spec owner에는 navigation만 추가했고 current contract를 복사하지 않았다.
- Result Consumption Gate: W5 exact Result, W1-W4 actual dependency, 전체 수용 disposition, checker의 later-stage revalidation residual과 controlling Evidence/owner handoff를 소비했다.
- Closeout audit: W1-W5 artifact disposition이 실제 tree와 일치하고 compatibility code/API field/product behavior를 추가하지 않았다. Registry Integrity와 required verification을 최종 재실행한 뒤 W5와 Stage 1을 닫고 Stage 2 W1만 활성화한다.

## 2026-09-02 · Stage 1 corrective boundary and alias closeout

- Reopen reason: independent review에서 architecture의 fail-closed claim보다 checker가 좁아 relative package-root escape와 고정 목록 밖 workspace package를 허용하는 gap을 확인했다. Stage 2 activation을 잠시 되돌리고 W6/W7 corrective closeout을 등록했다.
- W6 contract: dependency graph는 유지하면서 checker가 actual workspace package set을 discovery하고 package root 밖 relative import를 거부하게 한다. 각각 별도 Red를 재현한 뒤 Green으로 닫는다.
- W7 contract: 사용자 요청에 따라 10개 workspace의 package-local source alias를 `@/*`로 통일하되 package 간 public import인 `@aiox/*`와 root legacy source에는 영향을 주지 않는다.

### 2026-09-02 15:57 · W6 W7 result review와 재종결

- W6 result review: 기존 checker가 허용하던 package-root 밖 relative import와 고정 contract 목록 밖 workspace package를 각각 실패 테스트로 재현했다. Actual workspace discovery와 relative escape guard를 추가한 뒤 focused 7/7, lint와 typecheck가 통과해 revision 2 Attempt 1을 전체 수용한다.
- W7 result review: 10개 workspace가 config-local `@/* -> ./src/*`를 사용하고 TypeScript 6 compiler resolution으로 owner별 `src/index.ts`에 수렴함을 확인했다. `@aiox/*`는 package public namespace로 분리되며 `baseUrl`은 추가하지 않았다. Focused 2/2와 workspace 21/21, lint/typecheck/build가 통과해 revision 2 Attempt 1을 전체 수용한다.
- Runtime handoff: TypeScript `paths`는 emitted JavaScript를 rewrite하지 않는다. Stage 2는 실제 `@/*` runtime import를 도입하기 전에 Node 실행/build 또는 Vite resolver 설정과 runtime test를 함께 닫아야 한다.
- Closeout candidate: W6/W7 task result, architecture claim, checker와 alias config가 실제 tree에 일치한다. Full test, log/package registry, result consumption과 diff 검사를 통과한 뒤 Stage 1을 다시 `decided`로 닫고 Stage 2 W1을 재활성화한다.

### 2026-09-02 15:57 · corrective closeout verification

- Final verification: workspace focused tests 6 files/21 tests, full root 81 files/1021 tests와 10 child commands, `pnpm lint`, `pnpm typecheck`, `pnpm build`, boundary checker, package Registry Integrity와 `git diff --check`가 통과했다.
- Result Consumption: W6 revision 2 Attempt 1과 W7 revision 2 Attempt 1의 exact result, actual dependency, architecture correction과 Stage 2 runtime-resolver handoff를 controlling accepted state에 소비했다.
- Closeout: W1-W7을 completed로 닫고 Stage 1 status를 `decided`로 복구한다. Plan은 Stage 1 `[x]`, Stage 2만 `[>]`로 두고 Stage 2 W1을 유일한 next pointer로 재활성화한다.
