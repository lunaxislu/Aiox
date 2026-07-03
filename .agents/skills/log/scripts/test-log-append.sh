#!/bin/sh
# log new/block/entry/detach 회귀 테스트.

set -u

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
LOG="$SCRIPT_DIR/log"

export LOG_TODAY=2026-07-03
export LOG_NOW="2026-07-03 18:45"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT INT TERM

pass=0
fail=0

ok() { pass=$((pass + 1)); printf 'ok   %s\n' "$1"; }
ng() { fail=$((fail + 1)); printf 'FAIL %s\n' "$1"; }

check_contains() {
    name=$1 file=$2 pattern=$3
    if grep -q "$pattern" "$file"; then ok "$name"; else ng "$name"; cat "$file"; fi
}

check_fail() {
    name=$1
    shift
    if "$@" > "$WORK/out" 2>&1; then ng "$name 종료코드 0(실패 기대)"; else ok "$name"; fi
}

LOG_DIR="$WORK/logs"; export LOG_DIR

check_fail "A1 description 필수" "$LOG" new "No Desc" --block "Start"
check_fail "A1 block 필수" "$LOG" new "No Block" --description "Desc"

f=$("$LOG" new "New Test" --description "Desc" --block "Initial" --context Global "전역" --context W1,W3 "범위" --item active "첫 작업" --item open "둘째 작업")
check_contains "A2 Return Target 기본" "$f" '^- None: independent log\.$'
check_contains "A2 Required Context 생성" "$f" '^## Required Context$'
check_contains "A2 Global context" "$f" '^- 전역$'
check_contains "A2 scoped context" "$f" '^### {W1,W3}$'
check_contains "A2 active item" "$f" '^- \[>\] W1 첫 작업$'
check_contains "A2 open item" "$f" '^- \[ \] W2 둘째 작업$'
if awk '
    /^## Work Items$/ { getline; exit ($0 == "" ? 0 : 1) }
' "$f"; then ok "A2 Work Items heading blank"; else ng "A2 Work Items heading blank"; cat "$f"; fi

check_fail "A2 active item 단일성 guard" "$LOG" new "Bad Active" --description "Desc" --block "Start" --item active "a" --item active "b"

printf '%s\n' '- block body' | "$LOG" block add "$f" "Second block" >/dev/null
check_contains "A3 block add" "$f" '^## 2026-07-03 · Second block$'
check_contains "A3 block body" "$f" '^- block body$'
printf '%s\n' '- third body' | "$LOG" block add "$f" "Third block" >/dev/null

line=$(grep -n '^## 2026-07-03 · Second block$' "$f" | cut -d: -f1)
printf '%s\n' '- entry body' | "$LOG" entry add "$f" --after-line "$line" "Followup" >/dev/null
check_contains "A4 entry add" "$f" '^### 2026-07-03 18:45 · Followup$'
check_contains "A4 entry body" "$f" '^- entry body$'
if awk '
    /^### 2026-07-03 18:45 · Followup$/ { seen = 1; next }
    seen && /^- entry body$/ { body = 1; next }
    body && /^$/ { blank = 1; next }
    body && /^## 2026-07-03 ·/ { found = blank; exit }
    END { exit(found ? 0 : 1) }
' "$f"; then ok "A4 entry 다음 block separator"; else ng "A4 entry 다음 block separator"; cat "$f"; fi
check_fail "A4 after-line guard" "$LOG" entry add "$f" --after-line 1 "Bad"

fence_log=$("$LOG" new "Fence Entry" --description "Fence desc" --block "Start")
printf '%s\n' 'before fence' '```markdown' '## fake heading in fence' '```' | "$LOG" block add "$fence_log" "Fence block" >/dev/null
printf '%s\n' '- real next' | "$LOG" block add "$fence_log" "Real next" >/dev/null
fence_line=$(grep -n '^## 2026-07-03 · Fence block$' "$fence_log" | cut -d: -f1)
printf '%s\n' '- fenced entry body' | "$LOG" entry add "$fence_log" --after-line "$fence_line" "Fence-safe entry" >/dev/null
if awk '
    /^```markdown$/ { in_fence = 1; next }
    in_fence && /^```$/ { in_fence = 0; next }
    in_fence && /^### 2026-07-03 18:45 · Fence-safe entry$/ { bad = 1 }
    /^### 2026-07-03 18:45 · Fence-safe entry$/ { entry = NR }
    /^## 2026-07-03 · Real next$/ { real = NR }
    END { exit(!bad && entry > 0 && real > entry ? 0 : 1) }
' "$fence_log"; then ok "A4 fence 내부 heading 무시"; else ng "A4 fence 내부 heading 무시"; cat "$fence_log"; fi
fake_line=$(grep -n '^## fake heading in fence$' "$fence_log" | cut -d: -f1)
check_fail "A4 after-line fence guard" "$LOG" entry add "$fence_log" --after-line "$fake_line" "Bad fence"

parent=$("$LOG" new "Detach Parent" --description "Parent desc" --block "Start" --item active "Parent task")
child="$WORK/logs/child.md"
printf '%s\n' '- child body' | "$LOG" detach "$parent" --id W1 --target "$child" --reason "별도 조사 필요" --topic "Child" --description "Child desc" --block "Child start" --context ReturnTarget "child 결론을 parent W1이 소비" "parent W1 판단 기준" --item active "Child task" >/dev/null
check_contains "A5 source detached" "$parent" '^- \[↓\] W1 Parent task — detached: .*/child.md — reason: 별도 조사 필요$'
check_contains "A5 child created" "$child" '^topic: Child$'
check_contains "A5 child return log" "$child" "^- Log: \`$parent\`$"
check_contains "A5 child return item" "$child" '^- Work Item: W1$'
check_contains "A5 child consume" "$child" '^- Consume when: child 결론을 parent W1이 소비$'
check_contains "A5 child snapshot" "$child" '^- Context snapshot: parent W1 판단 기준$'
check_contains "A5 child body" "$child" '^- child body$'

parent2=$("$LOG" new "Detach Negative" --description "Parent desc" --block "Start" --item active "Parent task")
check_fail "A6 detach body 필수" "$LOG" detach "$parent2" --id W1 --target "$WORK/logs/no-body.md" --reason "r" --topic "C" --description "D" --block "B" --context ReturnTarget "c" "s" < /dev/null

small="$WORK/logs/small.md"
{
    echo '---'
    echo 'topic: Small'
    echo 'description: Small desc'
    echo 'status: open'
    echo '---'
    echo
    echo '## Work Items'
    echo
    echo '## Required Context'
    echo
    echo '### Return Target'
    echo
    echo '- None: independent log.'
    echo
    echo '## 2026-07-03 · Start'
} > "$small"
LOG_SOFT_LINES=5 LOG_HARD_LINES=24 "$LOG" block add "$small" "Long once" > "$WORK/long1.out" <<'BODY'
- body
BODY
LOG_SOFT_LINES=5 LOG_HARD_LINES=24 "$LOG" block add "$small" "Long twice" > "$WORK/long2.out" <<'BODY'
- body
BODY
check_contains "A7 long hint first" "$WORK/long1.out" '^HINT long-log:'
if grep -q '^HINT long-log:' "$WORK/long2.out"; then ng "A7 long hint 반복 억제"; cat "$WORK/long2.out"; else ok "A7 long hint 반복 억제"; fi
LOG_SOFT_LINES=5 LOG_HARD_LINES=24 "$LOG" block add "$small" "Long hard" > "$WORK/long3.out" <<'BODY'
- body
BODY
LOG_SOFT_LINES=5 LOG_HARD_LINES=24 "$LOG" block add "$small" "Long hard twice" > "$WORK/long4.out" <<'BODY'
- body
BODY
check_contains "A7 hard warning 승격" "$WORK/long3.out" '^WARN long-log:'
if grep -q '^WARN long-log:' "$WORK/long4.out"; then ng "A7 hard warning 반복 억제"; cat "$WORK/long4.out"; else ok "A7 hard warning 반복 억제"; fi

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
