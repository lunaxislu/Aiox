#!/bin/sh
# log item/context/meta 회귀 테스트.

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

check_fail_unchanged() {
    name=$1 file=$2
    shift 2
    cp "$file" "$WORK/before"
    if "$@" > "$WORK/out" 2>&1; then
        ng "$name 종료코드 0(실패 기대)"
    elif cmp -s "$file" "$WORK/before"; then
        ok "$name 실패/무변경"
    else
        ng "$name 원본 변경됨"
        cat "$WORK/out"
    fi
}

new_log() {
    dir=$1
    LOG_DIR="$dir" "$LOG" new "Item Test" --description "Item desc" --block "Start" --item active "첫 작업" > "$WORK/log-test-new.out"
    cat "$WORK/log-test-new.out"
}

LOG_DIR="$WORK/logs"; export LOG_DIR
f=$(new_log "$LOG_DIR")

"$LOG" item add "$f" open "둘째 작업" >/dev/null
check_contains "I1 item add open" "$f" '^- \[ \] W2 둘째 작업$'
if awk '
    /^- \[>\] W1 첫 작업$/ { seen = 1; next }
    seen && /^$/ { exit 1 }
    seen && /^- \[ \] W2 둘째 작업$/ { found = 1; exit }
    END { exit(found ? 0 : 1) }
' "$f"; then ok "I1 item add 연속 렌더링"; else ng "I1 item add 연속 렌더링"; cat "$f"; fi

"$LOG" item set "$f" --id W2 --status active >/dev/null
check_contains "I2 demote old active" "$f" '^- \[ \] W1 첫 작업$'
check_contains "I2 activate target" "$f" '^- \[>\] W2 둘째 작업$'

"$LOG" item set "$f" --id W2 --action "둘째 작업 수정" >/dev/null
check_contains "I3 action update" "$f" '^- \[>\] W2 둘째 작업 수정$'

"$LOG" item set "$f" --id W2 --status completed >/dev/null
check_contains "I4 completed" "$f" '^- \[x\] W2 둘째 작업 수정$'
check_fail_unchanged "I4 closed item 재전이 거부" "$f" "$LOG" item set "$f" --id W2 --status open

"$LOG" item set "$f" --id W1 --status cancelled --reason "범위 제외" >/dev/null
check_contains "I5 cancelled marker" "$f" '^- \[-\] W1 첫 작업 — cancelled: 범위 제외$'

f2=$(LOG_DIR="$WORK/logs" "$LOG" new "Transfer Test" --description "Transfer desc" --block "Start" --item active "이관 작업")
"$LOG" item set "$f2" --id W1 --status transferred --target logs/other.md --reason "다른 로그가 소유" >/dev/null
check_contains "I6 transferred marker" "$f2" '^- \[→\] W1 이관 작업 — transferred: logs/other.md — 다른 로그가 소유$'

f3=$(LOG_DIR="$WORK/logs" "$LOG" new "Required Test" --description "Required desc" --block "Start" --item active "필수 작업")
check_fail_unchanged "I7 cancelled reason 필수" "$f3" "$LOG" item set "$f3" --id W1 --status cancelled
check_fail_unchanged "I7 transferred target 필수" "$f3" "$LOG" item set "$f3" --id W1 --status transferred --reason "이관"
check_fail_unchanged "I7 detached item set 거부" "$f3" "$LOG" item set "$f3" --id W1 --status detached

"$LOG" context add "$f3" Global "전역 기준" >/dev/null
"$LOG" context add "$f3" W1 "W1 기준" >/dev/null
check_contains "I8 Global context add" "$f3" '^### {Global}$'
check_contains "I8 W context add" "$f3" '^### {W1}$'
if awk '
    /^- None: independent log\.$/ { seen_none = 1; blanks = 0; next }
    seen_none && /^$/ { blanks++; next }
    seen_none && /^### \{Global\}$/ { found = (blanks == 1); exit }
    END { exit(found ? 0 : 1) }
' "$f3"; then ok "I8 context add blank 단일"; else ng "I8 context add blank 단일"; cat "$f3"; fi

"$LOG" context set "$f3" --scope Global --index 1 "전역 기준 수정" >/dev/null
check_contains "I9 context set" "$f3" '^- 전역 기준 수정$'
"$LOG" context delete "$f3" --scope W1 --index 1 >/dev/null
if grep -q '^- W1 기준$' "$f3"; then ng "I9 context delete"; cat "$f3"; else ok "I9 context delete"; fi

check_fail_unchanged "I10 ReturnTarget context 직접 수정 거부" "$f3" "$LOG" context add "$f3" ReturnTarget "x"
check_contains "I10 ReturnTarget context 안내" "$WORK/out" '^ReturnTarget은 new/detach 생성 표면에서만 수정합니다\.$'

empty_wi="$WORK/empty-wi.md"
{
    echo '---'
    echo 'topic: Empty WI'
    echo 'description: Empty WI desc'
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
} > "$empty_wi"
"$LOG" item add "$empty_wi" open "첫 항목" >/dev/null
if awk '
    /^## Work Items$/ { getline a; getline b; exit(a == "" && b == "- [ ] W1 첫 항목" ? 0 : 1) }
' "$empty_wi"; then ok "I10 빈 Work Items item add blank 유지"; else ng "I10 빈 Work Items item add blank 유지"; cat "$empty_wi"; fi

no_rc="$WORK/no-rc.md"
{
    echo '---'
    echo 'topic: No RC'
    echo 'description: No RC desc'
    echo 'status: open'
    echo '---'
    echo
    echo '## Work Items'
    echo
    echo '- [>] W1 Task'
    echo
    echo '## 2026-07-03 · Start'
} > "$no_rc"
check_fail_unchanged "I10 Required Context 없는 파일 context add 거부" "$no_rc" "$LOG" context add "$no_rc" Global "x"

check_fail_unchanged "I11 meta decided guard" "$f3" "$LOG" meta set "$f3" --status decided
"$LOG" item set "$f3" --id W1 --status completed >/dev/null
"$LOG" meta set "$f3" --status decided >/dev/null
check_contains "I11 meta status decided" "$f3" '^status: decided$'

parent=$("$LOG" new "Detached Guard" --description "Detached desc" --block "Start" --item active "Parent task")
child="$WORK/logs/detached-child.md"
printf '%s\n' '- child body' | "$LOG" detach "$parent" --id W1 --target "$child" --reason "분리" --topic "Detached Child" --description "Child desc" --block "Start" --context ReturnTarget "consume" "snapshot" --item active "Child task" >/dev/null
check_fail_unchanged "I12 detached 남은 로그 decided 거부" "$parent" "$LOG" meta set "$parent" --status decided
check_fail_unchanged "I12 detached 남은 로그 superseded 거부" "$parent" "$LOG" meta set "$parent" --status superseded
"$LOG" item set "$parent" --id W1 --status completed >/dev/null
check_contains "I12 detached consume completed" "$parent" '^- \[x\] W1 Parent task — detached: .*/detached-child.md — reason: 분리$'
"$LOG" meta set "$parent" --status decided >/dev/null
check_contains "I12 consumed detached decided" "$parent" '^status: decided$'

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
