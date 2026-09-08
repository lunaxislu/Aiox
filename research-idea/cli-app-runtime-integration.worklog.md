---
topic: CLI-App 연동 및 Adapter policy 조사
description: Claude Code↔Claude App와 Codex CLI↔Codex App 연동 구조, MCP·GUI bridge 사례 및 AIOX Adapter policy를 조사·기록한다.
status: decided
---

## Work Items

- [x] W1 research-idea에 CLI-App 연동 조사와 외부 bridge 분석을 기록하고 검증한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 공식 문서와 조사한 외부 저장소를 근거로 확인 사실·추론·제안을 분리한다.

## 2026-09-01 · CLI-App 연동 조사와 정책 기록

공식 문서, 로컬 CLI read-only probe와 syedazharmbnr1/claude-chatgpt-mcp source를 대조해 research-idea/cli-app-runtime-integration.research.md를 작성했다. 핵심 결론은 Runtime/Conversation/Surface identity를 분리하고, Codex App Server 및 Claude Agent SDK/headless를 공식 control surface로 두며, App은 share/handoff/open surface로 모델링하는 것이다. GUI automation bridge는 실제 가능하지만 core stable이 아니라 third-party experimental tier로 제한한다. research-idea/similar-project.md에는 조사 저장소와 상세 문서 pointer를 추가했다.
