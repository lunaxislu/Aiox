---
topic: Claude plugin marketplace stale-path 및 bundle staleness 미검출
description: aiox claude-plugin setup의 idempotency 체크가 marketplace 등록 경로 유효성과 plugin bundle 내용 변경을 감지하지 못해, marketplace rename이나 channel-server.ts 소스 변경 후에도 stale plugin이 조용히 재사용되는 결함.
status: open
---

## Work Items

- [ ] W1 결함 1: aiox claude-plugin setup(src/adapters/claude/setup.ts:100,112)이 claude plugin list --json의 errors 필드나 marketplace 등록 경로의 실제 유효성을 검사하지 않아, marketplace 소스 디렉터리가 옮겨지거나 무효화돼도(cache-miss) 스스로 감지·복구하지 못하는 문제를 조사하고 고칠지 결정한다.
- [ ] W2 결함 2: claude plugin update가 plugin.json의 버전 문자열만 비교해 channel-server.ts 소스 변경으로 재번들링된 내용이 있어도 캐시를 갱신하지 않는 문제(우회는 uninstall 후 재설치)를 조사하고, build-plugin.sh를 claude-plugin setup 흐름에 자동으로 엮을지 결정한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- G1-B canonical-presentation corrective(logs/G1/2026-07-29-G1-B-canonical-presentation-corrective.md) W4 실제 Claude TUI 재현 검증 도중 2026-08-02에 발견했다. 두 결함 모두 그 세션에서 수동으로 우회 수정해 W4 검증 자체는 통과했지만, 근본 원인(코드)은 아직 고치지 않았다. 상세 재현 경위와 실측 증거(파일 경로, mtime, byte 크기, grep 결과)는 G1-B 로그의 2026-08-02 19:06 entry "W4 완료 · 실제 Claude TUI 재현 검증 및 재현 과정에서 발견한 인프라 결함 2건"이 원본이다 — 이 로그는 그 내용을 복사하지 않고 참조만 한다.


## 2026-08-02 · kickoff · G1-B W4 재현 도중 발견한 인프라 결함 분리

G1-B canonical-presentation corrective의 W4(실제 Claude TUI 재현 검증) 작업 중, canonical presentation 자체와 무관한 두 가지 tooling 결함을 발견했다. 사용자가 두 결함 모두 이 corrective와 분리된 독립 로그로 관리하도록 결정해 이 로그를 새로 만들었다.

두 결함 모두 재현 세션에서는 이미 수동으로 우회 수정했다(marketplace 재등록, plugin uninstall/reinstall). 이 로그의 목적은 그 우회가 아니라 근본 원인 코드를 고칠지, 고친다면 어떻게 고칠지 조사하고 결정하는 것이다. 아직 조사나 수정을 시작하지 않았다. W1과 W2 모두 착수 전 open 상태다.
