#!/bin/sh
# log items 회귀 테스트.

set -u

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
LOG="$SCRIPT_DIR/log"

export LOG_TODAY=2026-06-15

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT INT TERM

pass=0
fail=0

ok() { pass=$((pass + 1)); printf 'ok   %s\n' "$1"; }
ng() { fail=$((fail + 1)); printf 'FAIL %s\n' "$1"; }

write_log() {
    file=$1
    {
        echo '---'
        echo 'topic: 테스트'
        echo 'description: 설명'
        echo 'status: open'
        echo '---'
        echo
        echo '## Work Items'
        echo
        echo '## 2026-06-15 · 초기'
        echo
        echo '- body'
    } > "$file"
}

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

check_status() {
    name=$1 expected=$2
    shift 2
    if "$@" > "$WORK/out" 2>&1; then rc=0; else rc=$?; fi
    if [ "$rc" -eq "$expected" ]; then ok "$name"; else ng "$name rc=$rc expected=$expected"; cat "$WORK/out"; fi
}

# I1: add active는 W1을 만들고 check next pointer가 된다.
fx="$WORK/i1.md"; write_log "$fx"
"$LOG" items "$fx" add "첫 작업" --status active >/dev/null
check_contains "I1 W1 active 추가" "$fx" '^- \[>\] W1 첫 작업$'
if "$LOG" check "$fx" | grep -q '^next: line .*W1 첫 작업'; then ok "I1 next W1"; else ng "I1 next W1"; fi

# I2: add open은 다음 W-id를 발급하고 기존 active를 유지한다.
"$LOG" items "$fx" add "둘째 작업" >/dev/null
check_contains "I2 W2 open 추가" "$fx" '^- \[ \] W2 둘째 작업$'
if [ "$("$LOG" check "$fx" | grep -c '^next: line .*W1 첫 작업')" -eq 1 ]; then ok "I2 active 유지"; else ng "I2 active 유지"; fi

# I3: set active는 대상만 [>]로 만들고 기존 active는 [ ]로 내린다.
"$LOG" items "$fx" set --id W2 --status active >/dev/null
check_contains "I3 W1 demote" "$fx" '^- \[ \] W1 첫 작업$'
check_contains "I3 W2 active" "$fx" '^- \[>\] W2 둘째 작업$'

# I4: completed는 [x]로 닫고 --expect가 맞아야 한다.
"$LOG" items "$fx" set --id W2 --status completed --expect "둘째 작업" >/dev/null
check_contains "I4 W2 completed" "$fx" '^- \[x\] W2 둘째 작업$'
check_fail_unchanged "I4 expect mismatch" "$fx" "$LOG" items "$fx" set --id W1 --status completed --expect "다른 작업"

# I5: cancelled/transferred는 이유와 대상을 구조에 남긴다.
"$LOG" items "$fx" set --id W1 --status cancelled --reason "범위 변경" >/dev/null
check_contains "I5 cancelled" "$fx" '^- \[x\] W1 Cancelled: 첫 작업 — 범위 변경$'
fx2="$WORK/i5-transfer.md"; write_log "$fx2"
"$LOG" items "$fx2" add "이관 작업" >/dev/null
"$LOG" items "$fx2" set --id W1 --status transferred --target logs/other.md --reason "독립 로그" >/dev/null
check_contains "I5 transferred" "$fx2" '^- \[x\] W1 Transferred: 이관 작업 → logs/other.md — 독립 로그$'

# I5b: cancelled/transferred 필수 reason/target 누락은 거부한다.
fx2b="$WORK/i5b-required.md"; write_log "$fx2b"
"$LOG" items "$fx2b" add "필수 옵션 작업" >/dev/null
check_fail_unchanged "I5b cancelled reason 누락 거부" "$fx2b" "$LOG" items "$fx2b" set --id W1 --status cancelled
check_fail_unchanged "I5b transferred target 누락 거부" "$fx2b" "$LOG" items "$fx2b" set --id W1 --status transferred --reason "이관"
check_fail_unchanged "I5b transferred reason 누락 거부" "$fx2b" "$LOG" items "$fx2b" set --id W1 --status transferred --target logs/other.md

# I6: 완료된 항목은 다시 전이하지 않는다.
check_fail_unchanged "I6 completed 재전이 거부" "$fx2" "$LOG" items "$fx2" set --id W1 --status open

# I7: Work Items 섹션이 없어도 add가 섹션을 만든다.
fx3="$WORK/i7.md"
{
    echo '---'; echo 'topic: no-section'; echo 'description: 설명'; echo 'status: open'; echo '---'; echo
    echo '## 2026-06-15 · 초기'; echo; echo '- body'
} > "$fx3"
"$LOG" items "$fx3" add "섹션 생성" --status active >/dev/null
check_contains "I7 Work Items 생성" "$fx3" '^## Work Items$'
check_contains "I7 생성된 active" "$fx3" '^- \[>\] W1 섹션 생성$'

# I8: 중복 W-id는 적용을 거부한다.
fx4="$WORK/i8.md"; write_log "$fx4"
{
    echo '- [ ] W1 A'
    echo '- [ ] W1 B'
} >> "$fx4"
check_fail_unchanged "I8 중복 id 거부" "$fx4" "$LOG" items "$fx4" add "C"

# I9: 마지막 미완료를 닫으면 closeout 힌트를 출력한다.
fx5="$WORK/i9.md"; write_log "$fx5"
"$LOG" items "$fx5" add "끝낼 작업" --status active >/dev/null
out=$("$LOG" items "$fx5" set --id W1 --status completed)
if printf '%s\n' "$out" | grep -q 'decided 후보'; then ok "I9 closeout hint"; else ng "I9 closeout hint"; printf '%s\n' "$out"; fi

# I10: 문서화되지 않은 --active 별칭은 허용하지 않는다.
fx6="$WORK/i10.md"; write_log "$fx6"
check_fail_unchanged "I10 --active 별칭 거부" "$fx6" "$LOG" items "$fx6" add "별칭 작업" --active

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
