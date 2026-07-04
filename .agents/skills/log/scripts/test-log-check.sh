#!/bin/sh
# log check/search 회귀 테스트.

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

check_status() {
    name=$1 expected=$2
    shift 2
    if "$@" > "$WORK/out" 2>&1; then rc=0; else rc=$?; fi
    if [ "$rc" -eq "$expected" ]; then ok "$name"; else ng "$name rc=$rc expected=$expected"; cat "$WORK/out"; fi
}

LOG_DIR="$WORK/logs"; export LOG_DIR
f=$("$LOG" new "Check Test" --description "Check desc" --block "Start" --item active "First")
"$LOG" check "$f" > "$WORK/check.out"
check_contains "C1 status" "$WORK/check.out" '^status: open$'
check_contains "C1 latest" "$WORK/check.out" '^latest: line [0-9][0-9]* · 2026-07-03 · Start$'
check_contains "C1 counts" "$WORK/check.out" '^work_items: active=1 open=0 closed=0 detached=0 incomplete=1$'
check_contains "C1 next" "$WORK/check.out" '^next: line .*W1 First$'
check_contains "C1 return independent" "$WORK/check.out" '^return_target: independent$'

f2=$("$LOG" new "Searchable" --description "Unique needle" --block "Start")
"$LOG" search needle > "$WORK/search.out"
check_contains "C2 search finds description" "$WORK/search.out" 'Searchable — Unique needle'

"$LOG" item set "$f" --id W1 --status completed >/dev/null
"$LOG" check "$f" > "$WORK/clean.out"
check_contains "C3 closeout hint" "$WORK/clean.out" '^HINT closeout:'

bad="$WORK/bad.md"
{
    echo '---'
    echo 'topic: Bad'
    echo 'description: Bad desc'
    echo 'status: decided'
    echo '---'
    echo
    echo '## Work Items'
    echo '- [ ] W1 Remaining'
    echo
    echo '## Required Context'
    echo
    echo '### Return Target'
    echo
    echo '- None: independent log.'
    echo
    echo '## 2026-07-03 · Start'
} > "$bad"
check_status "C4 decided incomplete fails" 1 "$LOG" check "$bad"
check_contains "C4 status error" "$WORK/out" '^ERROR status: decided 로그에 미완료 Work Items가 있습니다$'

dup="$WORK/dup.md"
cp "$bad" "$dup"
sed -i.bak 's/status: decided/status: open/' "$dup"
{
    echo '- [ ] W1 Duplicate'
} >> "$dup"
check_status "C5 duplicate id fails" 1 "$LOG" check "$dup"
check_contains "C5 duplicate error" "$WORK/out" '중복 Work Item id입니다: W1'

detached="$WORK/detached.md"
{
    echo '---'
    echo 'topic: Detached'
    echo 'description: Detached desc'
    echo 'status: decided'
    echo '---'
    echo
    echo '## Work Items'
    echo
    echo '- [↓] W1 Waiting child — detached: logs/child.md — reason: child result'
    echo
    echo '## Required Context'
    echo
    echo '### Return Target'
    echo
    echo '- None: independent log.'
    echo
    echo '## 2026-07-03 · Start'
} > "$detached"
check_status "C6 decided detached fails" 1 "$LOG" check "$detached"
check_contains "C6 detached status error" "$WORK/out" '^ERROR status: decided 로그에 child 결과 소비 대기 \[↓\] Work Items가 있습니다$'
check_contains "C6 detached not closed count" "$WORK/out" '^work_items: active=0 open=0 closed=0 detached=1 incomplete=0$'
check_contains "C6 detached structured pointer" "$WORK/out" '^detached: line 9 target logs/child.md$'

missing_shape="$WORK/missing-shape.md"
{
    echo '---'
    echo 'topic: Missing Shape'
    echo 'description: Missing shape desc'
    echo 'status: open'
    echo '---'
    echo
    echo '## 2026-07-03 · Start'
} > "$missing_shape"
check_status "C7 required sections missing fails" 1 "$LOG" check "$missing_shape"
check_contains "C7 work items missing" "$WORK/out" '^ERROR work_items: ## Work Items 섹션은 정확히 하나여야 합니다$'
check_contains "C7 required context missing" "$WORK/out" '^ERROR required_context: ## Required Context 섹션은 정확히 하나여야 합니다$'
check_contains "C7 return target missing" "$WORK/out" '^ERROR required_context: ### Return Target 섹션이 없습니다$'

empty_item="$WORK/empty-item.md"
{
    echo '---'
    echo 'topic: Empty Item'
    echo 'description: Empty item desc'
    echo 'status: open'
    echo '---'
    echo
    echo '## Work Items'
    echo
    echo '- [ ] W1'
    echo
    echo '## Required Context'
    echo
    echo '### Return Target'
    echo
    echo '- None: independent log.'
    echo
    echo '## 2026-07-03 · Start'
} > "$empty_item"
check_status "C8 empty Work Item action fails" 1 "$LOG" check "$empty_item"
check_contains "C8 empty action error" "$WORK/out" 'Work Item action이 비어 있습니다: W1'

multi_next="$WORK/multi-next.md"
{
    echo '---'
    echo 'topic: Multi Next'
    echo 'description: Multi next desc'
    echo 'status: open'
    echo '---'
    echo
    echo '## Work Items'
    echo
    echo '- [>] W1 First'
    echo '- [>] W2 Second'
    echo
    echo '## Required Context'
    echo
    echo '### Return Target'
    echo
    echo '- None: independent log.'
    echo
    echo '## 2026-07-03 · Start'
} > "$multi_next"
check_status "C9 multiple next fails" 1 "$LOG" check "$multi_next"
check_contains "C9 multiple next error" "$WORK/out" '^ERROR next: next pointer가 2개입니다$'

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
