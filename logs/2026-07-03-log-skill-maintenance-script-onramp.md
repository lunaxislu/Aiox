---
topic: Log skill maintenance, script, onramp 정합화
description: Reviews log skill maintenance rules, scripts/log and tests, then project current-work/onramp integration and affected repo guidance.
status: open
---

## Work Items

- [>] W1 log skill maintenance 기준과 현재 owner/reference drift를 검토하고 수정 범위를 확정한다
- [x] W2 `scripts/log` 명령 표면과 회귀 테스트를 현재 portable log 계약에 맞춰 검토·수정한다
- [x] W3 project onramp/current-work integration과 영향받는 repo 지침을 검토·수정한다
- [ ] W4 전체 owner·호출·테스트 경로를 재검증하고 closeout 결과를 기록한다

## Required Context

### Return Target

- None: independent log.

### {Global}

- 이 로그를 재개하거나 토의하기 전에 `log/decision.md`를 읽는다. 그 파일의 기존
  "`scripts/onramp`와 `docs/guides/workflow.md`를 overhaul 완료 전 다루지 않는다"는 제약은
  사용자의 2026-07-03 직접 지시로 이 로그의 maintenance→script/tests→project integration
  작업 수명에 한해 다시 열렸다. 다른 작업에 대한 포괄적 폐기로 해석하지 않는다.
- portable log 규칙과 project integration을 분리한다. 일반 로그 의미·수명·도구 경계는
  `.agents/skills/log/`이, 이 repo의 현재 작업 선택·onramp·owner handoff는 root `AGENTS.md`,
  `logs/AGENTS.md`, `docs/guides/workflow.md`, `scripts/onramp`가 소유한다.
- 문서나 script를 바꾸기 전에 live owner, inbound/outbound reference, producer/consumer,
  tests를 끝까지 추적한다. 확인한 사실, 추론, 의견을 구분하고 의미 판단을 script에 넘기지 않는다.
- package-log 모델의 portable화와 설계 토론은 sibling
  `logs/2026-07-03-log-skill-package-log-model-discussion.md`가 소유한다. 이 로그는 package
  activation, package surface, source map, agent topology를 설계하거나 흡수하지 않는다.
- 기존 사용자·다른 agent의 변경을 덮어쓰지 않는다. 문서 이동·통합·삭제나 repo workflow의
  비용 큰 변경은 적용안, owner 범위와 검증 방법을 먼저 제시하고 사용자 승인을 확인한다.

## 2026-07-03 · Maintenance, script, onramp 정합화 착수

### 분리와 목적

- 사용자 판단에 따라 2,000줄을 넘긴 log-skill overhaul 토론에서 후속 수명을 분리했다.
- 이 작업은 완료 조건과 재개 상태가 package-log 모델 토론과 독립적이다. source Work Item의
  결과 소비 관계도 없으므로 Independent Follow-Up으로 시작하며 `## 복귀 대상`을 두지 않는다.
- 목적은 먼저 maintenance 규칙과 owner map을 정리하고, 그 확정 계약을 기준으로 log script와
  tests를 평가한 뒤, 마지막으로 이 repo의 onramp/current-work integration과 지침을 맞추는 것이다.

### 시작 근거

- **확인한 사실:** `.agents/skills/log/references/maintenance.md`는 portable skill,
  project integration, script 문제를 분류하고 문서 규칙을 script보다 먼저 확정하도록 요구한다.
- **확인한 사실:** `logs/AGENTS.md` 서두는 삭제된 `log-writing-rules.md`와
  `work-items-rules.md`를 아직 owner로 가리킨다. 현재 세부 owner는 `loop-rules.md`다.
- **확인한 사실:** `loop-rules.md`는 `## Work Items`와 `## Required Context`를 기본 template
  surface로 요구하지만, 현재 `scripts/log new`는 `## Required Context`를 생성하지 않는다.
- **확인한 사실:** 현재 marker 계약은 취소 `[-]`, 이관 `[→]`, detach `[↓]`를 구분하지만
  `scripts/log items set`은 cancelled/transferred를 `[x]` 텍스트로 렌더링하고 detach 전이를
  제공하지 않는다. 현재 세 test 파일도 이 구현을 기대한다.
- **확인한 사실:** `project-setup.md`의 current-work 최소 계약, root `AGENTS.md`,
  `docs/guides/workflow.md`, `scripts/onramp`는 현재 작업 선택을 함께 소비한다. live onramp는
  활성 plan이 없고 open 로그가 여러 개일 때 next-pointer graph의 유일한 leaf를 자동 선택한다.
- **확인한 사실:** `log/decision.md` 첫머리의 과거 제약은 overhaul 중 script/onramp/workflow를
  보지 말라고 했지만, 사용자가 이번 후속 로그에서 그 검토와 수정을 직접 지시했다.
- **추론:** 위 차이들은 실제 drift 후보이지만, 각각 portable owner 수정인지 repo integration
  수정인지와 호환성 영향은 W1~W3에서 호출·테스트 경로를 대조한 뒤 확정해야 한다.

### Scope와 owner 경계

- Primary scope: `.agents/skills/log/references/maintenance.md`, `.agents/skills/log/scripts/log`,
  `.agents/skills/log/scripts/test-log-*.sh`, `scripts/onramp`.
- 영향 검토 대상: `.agents/skills/log/SKILL.md`, `loop-rules.md`, `project-setup.md`,
  `example.md`, root `AGENTS.md`, `logs/AGENTS.md`, `docs/guides/workflow.md`, 관련 hook·tests.
- package-log modeling은 sibling 로그가 소유하므로 제외한다. workspace-reset package template의
  내용 개편도 package 결과가 오기 전 이 로그에서 선점하지 않는다.
- 로그 의미 판단 자동화, 새 상태기계·명령의 편의상 추가, 현재 사례만 막는 repo 전용 규칙을
  portable skill에 복사하는 변경은 제외한다.

### Ordered work

1. W1에서 maintenance identity, owner reference, 승인 gate와 stale 문구를 live 파일 기준으로
   분류하고 최소 적용안을 확정한다.
2. W2에서 확정된 portable 계약을 `scripts/log`의 `new/search/check/set-status/append/items`와
   세 회귀 test suite에 대조한다. 구조·원자성·format guard만 script에 남기고 의미 판정은
   agent에게 둔다.
3. W3에서 `project-setup.md` 최소 계약을 root 지침, `logs/AGENTS.md`, workflow guide,
   `scripts/onramp`와 대조한다. 사용자 지정→plan anchor/pointer→no-plan 선택 경로와 모호성
   정지 조건의 단일 owner·소비 관계를 정리한다.
4. W4에서 수정 파일의 inbound/outbound link, command output, tests와 문서 예시를 다시 확인하고
   결정·변경·검증·남은 후속을 이 로그에 기록한 뒤 status를 판정한다.

### 검증 계획

- 구조: `.agents/skills/log/scripts/log check <이 로그>`와 관련 open/fixture 로그 구조 점검.
- script: `test-log-check.sh`, `test-log-items.sh`, `test-log-append.sh` 전체 실행 및 새 계약의
  positive/negative 회귀 사례 추가 여부 확인.
- integration: `scripts/onramp`의 plan 없음/단일 open/복수 open/유일 leaf/복수 leaf/깨진
  pointer/순환/복수 활성 plan 경로를 fixture 또는 기존 test owner에서 검증한다.
- 문서: owner reference와 anchor를 `rg`로 교차 확인하고 `git diff --check`를 실행한다.
- closeout: portable rule과 repo integration의 책임이 섞이지 않았는지, script 문서와 실제
  동작이 일치하는지, sibling package-log 범위를 침범하지 않았는지 검토한다.

### 2026-07-03 17:17 · W2 `log new` 기본 형태 합의

@user와 `scripts/log new`의 개선된 기본 형태를 먼저 토론했다.

- **확인한 사실:** 현재 portable log 계약은 frontmatter field를 `topic`, `description`,
  `status`로 둔다. 사용자와 agent는 field명을 `topic`으로 유지하고 frontmatter 수정은 별도
  명령으로 분리하기로 합의했다.
- **합의:** `log new`는 status를 기본 `open`으로 생성한다. 생성 시 `decided` 또는
  `superseded`를 직접 만들지 않는다.
- **합의:** `log new`는 `## Work Items`와 `## Required Context`를 항상 생성한다. 두 섹션은
  인자가 없으면 비어 있을 수 있다.
- **합의:** Work Item 초기 생성은 optional이다. 인자가 있으면 `active` 또는 `open` item을
  여러 개 추가할 수 있게 한다.
- **합의:** Required Context 초기 생성도 optional이다. 인자가 있으면 `{Global}` 또는
  `{W1,W3}` 같은 scope heading 아래 bullet로 렌더링한다. script는 형식 렌더링만 담당하고,
  해당 scope가 의미상 맞는지는 agent와 사용자가 판단한다.
- **합의:** 첫 unit block topic은 반드시 받아야 한다. `--block` 같은 필수 인자로 명시하고,
  `topic`을 암묵 상속하지 않는다.
- **합의된 기본 명령 형태 후보:**

```sh
log new "<topic>" \
  --description "<description>" \
  --block "<unit block topic>" \
  [--context Global:"..."] \
  [--context W1,W3:"..."] \
  [--item active:"첫 작업"] \
  [--item open:"둘째 작업"]
```

- **합의된 생성 결과 골격:**

```markdown
---
topic: <topic>
description: <description>
status: open
---

## Work Items

## Required Context

## YYYY-MM-DD · <unit block topic>
```

- **추가 합의:** `description`은 생성 시 필수로 한다.
- **추가 합의:** 기존 positional `log new "<주제>" [설명]` 형태와의 호환성은 고려하지 않는다.
  사용자가 각 세션에서 legacy 호환성 무시를 직접 지시할 예정이다.
- **남은 논의:** `--context`와 `--item`의 shell parsing 형식을 정확히 어떻게 제한할지, long-log
  hint, `block add`, `entry add`, item 수정, Required Context 수정 명령 표면을 결정해야 한다.

### 2026-07-03 17:17 · W2 명령 표면 추가 합의

@user와 `log new` 이후의 명령 표면을 이어서 토론했다.

- **합의:** legacy compatibility는 더 이상 고려하지 않는다. 기존 `set-status` 명령은 alias로
  남기지 않고 `meta set --status`로 통합한다.
- **합의:** frontmatter 수정은 `meta set`이 소유한다.

```sh
log meta set <file> --topic "<topic>"
log meta set <file> --description "<description>"
log meta set <file> --status open|decided|superseded
```

- **합의:** `meta set --status decided|superseded`는 구조 guard를 포함한다. 미완료 `[ ]` 또는
  `[>]` Work Item이 있으면 거부한다.
- **합의:** `--item`과 `--context`는 colon 결합형을 쓰지 않고 다음처럼 두 인자 형태로 받는다.

```sh
--item active "첫 작업"
--context W1,W3 "공통 기준"
```

- **합의:** `block add`는 새 `## YYYY-MM-DD · <unit block topic>`을 만들고 stdin body를 그
  block의 첫 기록으로 둔다. 따라서 새 block을 만들 때 `block add`와 `entry add`를 모두 실행할
  필요는 없다.
- **합의:** `entry add`는 기존 unit block heading line을 `--after-line`으로 지정하고, 그 block
  아래에 `### YYYY-MM-DD HH:MM · <entry topic>` entry와 stdin body를 추가한다.
- **합의:** `block add`와 `entry add`는 적용된 heading line을 매번 출력하지 않는다. 파일 길이가
  long-log threshold를 넘을 때만 hint를 출력한다.
- **합의:** `item add`는 해당 로그의 다음 W-id를 자동 발급한다. 사용자가 Wn을 직접 지정할 필요가
  없다.
- **합의:** item 전이에는 reason을 필수로 둔다. `transferred`는 target도 필수다.
- **남은 논의:** `detached` 전이를 script가 생성 명령으로 제공할지, 제공한다면 source item 변경과
  target 로그의 복귀 대상 검증을 어느 수준까지 수행할지 결정해야 한다.

### 2026-07-03 17:59 · W2 detach와 Return Target 구조 합의

@user와 현재 skill의 detach guidance를 확인한 뒤, 개선된 script/log 계약에서 detach와 return
관계를 어떻게 구조화할지 토론했다.

- **확인한 사실:** 현재 `loop-rules.md`는 detach를 source Work Item이 분리 작업 로그의 결과를
  나중에 소비해야 할 때 쓰는 전이로 정의한다. 현재 문서는 child 로그에 별도 `## 복귀 대상`
  section을 두라고 하지만, 개선 계약에서는 `## Required Context` 하위 구조로 흡수하기로 했다.
- **확인한 사실:** 현재 marker 공통 문장은 detached에 사유·경로를 남긴다고 표현하지만, 현재
  Detach 세부 절과 예시는 `— detached: <target>`만 사용한다. 이 drift는 detached에도 reason을
  명시하는 방향으로 문서와 예시를 갱신하기로 했다.
- **합의:** `## Required Context` 아래에 `### Return Target` section을 둔다. return할 대상이 없는
  독립 로그도 이 section을 두고 독립 로그임을 명시한다.
- **합의된 independent 형태 후보:**

```markdown
## Required Context

### Return Target

- None: independent log.
```

- **합의된 detached child 형태 후보:**

```markdown
## Required Context

### Return Target

- Log: `logs/A.md`
- Work Item: W2
- Consume when: child가 결론을 내면 parent W2가 결과를 소비한다.
- Context snapshot: parent W2 판단에 필요한 기준만 가져온다.
```

- **합의:** `Return Target` 값은 Required Context 하위 구조이므로 `log new`와 `log detach` 모두
  `--context ReturnTarget ...` 계열 인자로 받는다. 별도 top-level `--return-when`이나
  `--return-snapshot`은 두지 않는다.
- **합의된 `log new` ReturnTarget 인자 후보:**

```sh
log new "<topic>" \
  --description "<description>" \
  --block "<unit block topic>" \
  --context ReturnTarget logs/A.md W2 "소비 조건" "context snapshot"
```

- **합의된 `log detach` 기본 형태 후보:** 첫 인자는 기존 source 로그이고 `--target`은 새로 생성할
  child 로그다. `log detach`는 target child 로그 생성을 반드시 동반하며, source item만 `[↓]`로
  바꾸는 단독 전이는 제공하지 않는다.

```sh
log detach <source-log> \
  --id W2 \
  --target logs/B.md \
  --reason "W2 완료 판단에 별도 조사가 필요함" \
  --topic "Child investigation" \
  --description "Investigates evidence needed by parent W2." \
  --block "Start child investigation" \
  --context ReturnTarget "소비 조건" "context snapshot" \
  [--item active "조사 수행"]
```

- **합의:** `log detach`에서는 source log와 source W-id가 이미 입력되므로 `ReturnTarget`의 Log와
  Work Item은 script가 자동으로 채운다. 사용자는 consume condition과 snapshot만 제공한다.
- **합의:** source Work Item line에는 detached target과 reason을 모두 남긴다.

```markdown
- [↓] W2 Resume the naming decision with B's result. — detached: logs/B.md — reason: W2 완료 판단에 별도 조사가 필요함
```

- **합의:** source item line의 reason은 routing surface에서 분리 이유를 audit 가능하게 하기 위한
  최소 정보이고, child가 source 결과를 언제/어떻게 소비할지는 child의 `### Return Target`이
  소유한다.
- **남은 논의:** `log detach`가 source history block까지 자동 작성할지, target body를 stdin으로
  필수 받을지, source next pointer가 비게 될 때 hint만 줄지 또는 다른 guard를 둘지 결정해야 한다.

### 2026-07-03 18:19 · W2 `scripts/log` 명령 표면 초안

이 entry는 사용자와 토론한 개선된 `scripts/log` 명령 표면의 초안이다. 아직 구현 전 설계
checkpoint이며, legacy command compatibility는 고려하지 않는다.

#### 공통 원칙

- script는 구조 생성, 원자적 변경, 형식 guard, lint/hint만 담당한다. detach/transfer/closeout 같은
  의미 판단은 agent와 사용자가 한다.
- frontmatter field는 `topic`, `description`, `status`를 유지한다.
- status 값은 `open`, `decided`, `superseded`만 허용한다.
- 생성되는 날짜와 timestamp는 로컬 기준을 사용한다.
- long-log hint는 파일 길이가 threshold를 넘을 때만 출력한다. 매번 추가 line을 출력하지 않는다.
  기본 threshold 후보는 soft 600 lines, hard 1000 lines이며 env override 후보는 후속 구현에서
  확정한다.

#### `log new`

```sh
log new "<topic>" \
  --description "<description>" \
  --block "<unit block topic>" \
  [--context ReturnTarget logs/A.md W2 "소비 조건" "context snapshot"] \
  [--context Global "전체 기준"] \
  [--context W1,W3 "W1/W3 기준"] \
  [--item active "첫 작업"] \
  [--item open "둘째 작업"]
```

- `description`은 필수다.
- status는 항상 `open`으로 생성한다.
- `--block`은 필수다. 첫 unit block topic은 `topic`을 암묵 상속하지 않는다.
- `## Work Items`와 `## Required Context`는 항상 생성한다.
- Work Item 초기 생성은 optional이다. 인자가 있으면 다음 W-id를 자동 발급한다.
- Required Context 초기 생성은 optional이다.
- `### Return Target`은 `## Required Context` 하위에 항상 둔다. Return target이 없으면 독립 로그로
  명시한다.

```markdown
### Return Target

- None: independent log.
```

Return target이 있으면:

```markdown
### Return Target

- Log: `logs/A.md`
- Work Item: W2
- Consume when: 소비 조건
- Context snapshot: context snapshot
```

#### `log meta set`

```sh
log meta set <file> --topic "<topic>"
log meta set <file> --description "<description>"
log meta set <file> --status open|decided|superseded
```

- 기존 `set-status` 명령은 유지하지 않는다.
- `--status decided|superseded`는 구조 guard를 포함한다. 미완료 `[ ]` 또는 `[>]` Work Item이 있으면
  거부한다.

#### `log block add`

```sh
log block add <file> "<unit block topic>" < body.md
```

- 새 `## YYYY-MM-DD · <unit block topic>` block을 추가한다.
- stdin body는 필수이며, 해당 block의 첫 기록이 된다.
- 적용 성공 시 매번 line 번호를 출력하지 않는다. long-log threshold를 넘으면 hint만 출력한다.

#### `log entry add`

```sh
log entry add <file> --after-line <line> "<entry topic>" < body.md
```

- `--after-line`은 기존 `## YYYY-MM-DD · ...` unit block heading line을 가리켜야 한다.
- 해당 block 아래에 `### YYYY-MM-DD HH:MM · <entry topic>` entry를 추가한다.
- stdin body는 필수다.
- 적용 성공 시 매번 line 번호를 출력하지 않는다. long-log threshold를 넘으면 hint만 출력한다.

#### `log item add` / `log item set`

```sh
log item add <file> active|open "<action>"
log item set <file> --id Wn --action "<new action>"
log item set <file> --id Wn --status active|open|completed
log item set <file> --id Wn --status cancelled --reason "<reason>"
log item set <file> --id Wn --status transferred --target <target> --reason "<reason>"
```

- `item add`는 해당 로그의 다음 W-id를 자동 발급한다.
- `active` 전이는 기존 `[>]`를 `[ ]`로 내릴 수 있다.
- `cancelled`와 `transferred`는 reason 필수다. `transferred`는 target도 필수다.
- `detached`는 단순 `item set` 전이로 제공하지 않는다. detach는 child 로그 생성과 묶인
  `log detach`가 소유한다.

#### `log context add/set/delete`

```sh
log context add <file> Global "<content>"
log context add <file> W1,W3 "<content>"
log context set <file> --scope Global --index 1 "<content>"
log context delete <file> --scope W1,W3 --index 2
```

- context scope는 `Global`, `Wn` set, reserved `ReturnTarget`만 허용한다.
- 일반 context는 `{Global}` 또는 `{W1,W3}` heading 아래 bullet로 렌더링한다.
- 수정/삭제는 해당 scope 하위 bullet index로 지정한다. 문장 매칭으로 수정/삭제하지 않는다.
- `ReturnTarget` 수정 표면은 일반 bullet index 수정과 분리할지 후속 구현에서 확정한다.

#### `log detach`

```sh
log detach <source-log> \
  --id W2 \
  --target logs/B.md \
  --reason "W2 완료 판단에 별도 조사가 필요함" \
  --topic "Child investigation" \
  --description "Investigates evidence needed by parent W2." \
  --block "Start child investigation" \
  --context ReturnTarget "소비 조건" "context snapshot" \
  [--item active "조사 수행"] \
  < body.md
```

- 첫 인자는 기존 source 로그다. `--target`은 새로 생성할 child 로그다.
- `log detach`는 target child 로그 생성을 반드시 동반한다. source item만 `[↓]`로 바꾸는 단독 전이는
  제공하지 않는다.
- source W-id는 open 또는 active 상태여야 한다.
- target 파일이 이미 있으면 거부한다.
- `--reason`, `--topic`, `--description`, `--block`, `--context ReturnTarget ...`은 필수다.
- `--context ReturnTarget`의 Log와 Work Item은 source log와 `--id`로 자동 채운다. 사용자는 consume
  condition과 snapshot만 제공한다.
- stdin body는 필수이며, child 로그 첫 unit block의 body가 된다.
- source Work Item line은 target과 reason을 모두 남긴다.

```markdown
- [↓] W2 Resume the naming decision with B's result. — detached: logs/B.md — reason: W2 완료 판단에 별도 조사가 필요함
```

- source history block은 자동 작성하지 않는다. 분리 판단과 이유의 자세한 narrative는 agent가 별도
  `block add` 또는 `entry add`로 기록한다.
- source의 `[>]`가 없어져도 다른 Work Item을 자동 active로 올리지 않는다. 필요한 경우 hint만
  출력한다.
- migration detach는 이 명령 표면에서 제외한다.

#### `log search` / `log check`

- `search`는 frontmatter `topic`, `description`, `status` 기반 후보 검색으로 제한한다. 본문
  full-text 검색은 `rg` 같은 일반 검색 도구를 쓴다.
- `check`는 구조 lint와 재개 표면 요약을 담당한다. frontmatter, Work Items count, `[>]`,
  unresolved `[↓]`, `Return Target`, latest block/entry, status guard 후보, long-log 상태를 요약하는
  방향으로 확장한다.

#### 문서 갱신 필요

- `loop-rules.md`: `## Required Context` 하위 `### Return Target` 구조, detached reason 필수,
  `## 복귀 대상` 제거 또는 대체 규칙 반영.
- `example.md`: detached/independent 예시를 `### Return Target` 구조와 detached reason 포함 형태로
  갱신.
- `project-setup.md`: current-work/onramp 예시에서 unresolved `[↓]`와 child return target 구조를
  새 형태로 갱신.
- `scripts/log` tests: new/meta/block/entry/item/context/detach/check positive·negative 사례 추가.

### 2026-07-03 19:32 · Claude review follow-up 반영

- Claude 재리뷰에서 확인된 script 결함을 반영했다.
- `entry add`는 fenced code block 내부 heading을 삽입 기준으로 보지 않도록 fence-aware 처리하고, `--after-line` 검증도 fence-aware로 맞췄다.
- Work Item 판정은 `parse_item` 기반으로 통일하고 빈 action을 `check` error로 잡게 했다. Unicode marker(`[↓]`, `[→]`)는 literal branch로 파싱해 멀티바이트 substr 의존을 제거했다.
- `item add` 빈 Work Items 섹션 렌더링과 `context add` 새 scope blank 중복을 canonical 형태로 정리했다.
- `[↓]` source item은 child 결과 소비 뒤 `log item set --status completed`로 `[x]` 처리할 수 있게 했고, detached target/reason tail은 보존한다. 취소·이관·남은 행동 재구성은 수동 판단 범위로 유지했다.
- dead code 성격의 `latest_heading`, `--expect` 잔재, `LOG_LIB_ONLY`, 도달 불가 ReturnTarget context branch를 제거했다.
- `logs/.log-hints/`를 `.gitignore`에 추가해 long-log 1회 알림 상태 파일이 git status를 오염시키지 않게 했다.
- 검증: `sh -n .agents/skills/log/scripts/log`, `test-log-append.sh` 28 passed, `test-log-items.sh` 26 passed, `test-log-check.sh` 21 passed, `git diff --check` 통과.

### 2026-07-03 19:42 · long-log hint state 문서화

- `$LOG_DIR/.log-hints/`는 로그 저장 위치별 long-log 1회 알림 상태로 유지하기로 정리했다.
- `project-setup.md`의 긴 로그 split guard 안내에 soft/hard 알림은 append 계열 동작에서 파일별 1회만 출력되고, 반복 알림 상태는 `$LOG_DIR/.log-hints/`에 저장된다고 명시했다.
- 다른 repo에 log skill을 도입할 때 선택한 로그 위치의 `.log-hints/`를 `.gitignore`에 추가하도록 예시를 넣었다.
- 검증: `git diff --check`, `sh -n .agents/skills/log/scripts/log` 통과.

### 2026-07-04 08:36 · Claude review 1~6 반영

- Claude 재리뷰의 1~6번을 반영했다. example.md의 `entry add --after-line` 설명을 날짜 unit block heading 기준으로 고치고, `[↓]` 소비 예시의 detached reason tail을 원문 그대로 보존하도록 수정했다.
- `scripts/log check`의 Work Item count에서 `[↓]`를 `closed`에 합산하지 않게 바꿨다. 이제 child 결과 소비 대기는 `detached`로만 집계되고, 완료/취소/이관된 item만 `closed`에 들어간다.
- `context add/set/delete ReturnTarget`은 generic invalid-scope 오류가 아니라 생성 표면에서만 수정한다는 전용 안내를 출력하도록 검사 순서를 조정했다.
- long-log hint 테스트에 soft 알림 이후 hard threshold 도달 시 `WARN` 1회 출력과 반복 억제 케이스를 추가했다. ReturnTarget 안내와 `[↓]` count도 회귀 테스트로 고정했다.
- 기존 legacy 전체 호환은 추가하지 않았다. 다만 실제 onramp 경고 대상인 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`에는 현재 계속 쓰는 open 로그로서 `### Return Target` / `- None: independent log.`만 보강했다.
- 이 maintenance 로그 자체도 새 `check` 필수 구조에 맞게 `### Return Target` / `- None: independent log.`를 보강한 뒤 이 entry를 기록했다.
- 검증: `sh -n .agents/skills/log/scripts/log`, `test-log-append.sh` 30 passed, `test-log-items.sh` 27 passed, `test-log-check.sh` 22 passed, `git diff --check` 통과. 보강한 active 로그는 `log check`에서 `return_target: independent`로 통과했다.

### 2026-07-04 09:23 · W3 onramp 연동 정합화

- W3 범위의 onramp ↔ log 연동 정합화를 반영했다. `scripts/onramp`는 plan 단계의 명시적 `-> ` 포인터만 anchor로 삼고, 로그 내부에서는 local `[>]`를 우선하며 local `[>]`가 없고 unresolved `[↓]` target이 정확히 하나일 때만 child 로그를 따라간다.
- `.agents/skills/log/scripts/log check`는 unresolved `[↓]`에 대해 `detached: line N target <path>` 구조화 라인을 출력하게 했다. onramp는 이 출력만 소비하고 본문 grep으로 의미를 추론하지 않는다.
- `scripts/test-onramp.sh`를 새 로그 shape와 `[↓]` 모델로 갱신하고, 단일 `[↓]` follow, `[>]` 우선, 복수 `[↓]` ambiguous, broken target, plan `->` marker-only anchor를 회귀로 고정했다.
- `docs/guides/workflow.md`는 next pointer 체인 표현을 local `[>]` / unresolved `[↓]` / `Return Target` 모델로 갱신했다. `logs/AGENTS.md`의 삭제된 reference owner는 `references/loop-rules.md`로 정정했다.
- 실제 live onramp 오anchor 원인이던 `plans/workspace-reset/workspace-reset.md` 활성 단계의 앞쪽 historical log 언급은 더 이상 anchor로 잡히지 않고, 끝의 `-> logs/2026-06-29-workspace-reset-stage9-post-mvp-plan-disposition.md`를 현재 작업 로그로 선택한다.
- stage9 로그는 현재 계속 쓰는 open 로그라 새 `check` 필수 구조에 맞춰 `### Return Target` / `- None: independent log.`만 최소 보강했다. legacy 전체 자동 repair는 추가하지 않았다.
- no-plan leaf 자동선택은 유지하기로 판단했다. 이 repo 확장 동작으로 두되, edge 기준은 구 `[>]` embedded path가 아니라 새 `[↓]` detached target으로 정렬했다.
- 검증: `sh -n` log/onramp 통과, `test-log-append.sh` 30 passed, `test-log-items.sh` 27 passed, `test-log-check.sh` 23 passed, `scripts/test-onramp.sh` 13 passed, `scripts/onramp` live stage9 선택, `scripts/check-markdown-inline-code docs/guides/workflow.md`, `git diff --check` 통과.
