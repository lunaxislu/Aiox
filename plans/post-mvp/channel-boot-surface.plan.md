---
title: Channel server boot failure surface to daemon — execution sub-plan
description: >
  Claude channel server child process 부팅 실패를 daemon attach response에 surface하는
  실행 sub-plan. 비권위 execution 문서다 — adapter runtime surface(launch/attach/health)
  결정 권위는 prd/post-mvp/aiox-a2a-spec.md §5가 가진다.
status: deferred (post-MVP, unordered candidate)
implements: prd/post-mvp/aiox-a2a-spec.md §5
owner: TBD
rationale: history/47 (Step 15 Phase B)
---

> **권위 안내.** adapter runtime surface(launch/attach/identity/health) 결정 본문은
> `prd/post-mvp/aiox-a2a-spec.md` §5다. 본 문서는 그 health/attach surface를 구현하는
> 실행 detail만 보유한다.

## Motivation

Claude channel server는 Claude CLI child process 안에서 부팅된다. 현재 daemon attach는
token 발급 단계까지만 관여하므로 channel server 부팅 실패가 attach response에 직접
surface되지 않는다.

대표 문제:

- `AIOX_CLAUDE_CHANNEL_PORT` 점유 시 child process는 typed fatal JSON을 stderr에 쓰고
  exit한다.
- daemon은 attach 성공으로 응답한 뒤 child process 실패를 즉시 알지 못한다.
- 사용자는 다음 inject 시점의 `target_runtime_unavailable` 같은 deferred reason으로야
  문제를 인지할 수 있다.

## Candidate Direction

- daemon과 Claude channel server child process 사이에 startup acknowledgment 경로를 둔다.
- attach success의 의미를 "channel server listen/healthy 확인 완료"로 좁힌다.
- child process exit/fatal JSON을 daemon이 관측하고 typed failure로 propagate하는 대안도
  검토한다.

## Notes

- 현재 known reason: `claude_channel_port_in_use`.
- token 검증 실패, daemon socket 미존재 등 channel server boot 단계의 typed failure도
  같은 surface로 정리한다.
- Codex runtime 등 다른 child process startup surface는 별도 후보로 둔다.

## Provenance

- Phase B closeout §AIOX_CLAUDE_CHANNEL_PORT: `history/47-step-15-phase-b-closeout.history.md`
- 현재 child process surface 코드: `src/adapters/claude/channel-server.ts`.
