---
title: Codex structured metadata spike — execution sub-plan
description: >
  Codex `turn/start` 또는 app-server surface가 aiox envelope metadata를 text injection
  없이 structured context로 운반할 수 있는지 조사하는 실행 sub-plan. 비권위 execution
  문서다 — A2A protocol/open-question 결정 권위는 prd/post-mvp/aiox-a2a-spec.md §4·§9가
  가진다.
status: deferred (post-MVP, unordered candidate)
implements: prd/post-mvp/aiox-a2a-spec.md §4, §9
decided_at: 2026-06-05
owner: TBD (kickoff 시 지정)
rationale: history/58-post-mvp-a2a-architecture-decisions.history.md
---

> **권위 안내.** 본 문서는 비권위 investigation sub-plan이다. Codex 같은 prompt/text
> fallback runtime의 authority 한계와 A2A lifecycle 결정 본문은
> `prd/post-mvp/aiox-a2a-spec.md` §4·§9가 권위다. 여기서는 조사 질문, 확인 방법,
> 산출물만 다룬다.

## 1. 질문

Codex `turn/start` 또는 app-server 계열 surface가 `messageId`, `deliveryId`,
`reply_expected`, `intent`, `source`, `target` 같은 aiox metadata를 native structured
context로 받을 수 있는가?

## 2. 왜 필요한가

현재 prompt/text injection은 agent가 "이 메시지에 답해야 하는가"를 텍스트에서 추론해야
한다. structured metadata native path가 있으면 reply 판단을 prompt 설득력에 덜 의존하게
만들 수 있다. 그런 path가 없으면 A2A v1은 text fallback의 한계를 typed degradation으로
명시하고, envelope/rendering 개선은 confidence 향상으로만 다뤄야 한다.

## 3. 산출물

- Codex/app-server surface capability 조사 결과.
- native structured metadata path가 있을 때의 adapter render/inject 후보.
- 없을 때의 fallback policy와 typed degradation 문구.
- 필요 시 `envelope-metadata.plan.md` scope 조정 제안.

## 4. Verification

- 사용한 Codex surface와 version/date를 기록한다.
- 최소 smoke: `reply_expected=true` delivery가 native metadata 또는 fallback prompt에서
  어떻게 보이는지 캡처한다.
- 조사 결과는 history amend 또는 해당 구현 PR history에 요약한다.
