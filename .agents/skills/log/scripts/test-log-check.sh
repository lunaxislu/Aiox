#!/bin/sh
# log check 회귀 테스트.

set -u

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
LOG="$SCRIPT_DIR/log"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT INT TERM

pass=0
fail=0

ok() { pass=$((pass + 1)); printf 'ok   %s\n' "$1"; }
ng() { fail=$((fail + 1)); printf 'FAIL %s\n' "$1"; }

write_log() {
    file=$1
    status=${2:-open}
    {
        echo '---'
        echo 'topic: 테스트'
        echo 'description: 설명'
        printf 'status: %s\n' "$status"
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

check_status() {
    name=$1 expected=$2
    shift 2
    if "$@" > "$WORK/out" 2>&1; then
        rc=0
    else
        rc=$?
    fi
    if [ "$rc" -eq "$expected" ]; then ok "$name"; else ng "$name rc=$rc expected=$expected"; cat "$WORK/out"; fi
}

# C1: 단일 파일 요약은 status/topic/latest/count/next를 출력한다.
fx="$WORK/c1.md"; write_log "$fx"
"$LOG" items "$fx" add "첫 작업" --status active >/dev/null
"$LOG" check "$fx" > "$WORK/c1.out"
check_contains "C1 status" "$WORK/c1.out" '^status: open$'
check_contains "C1 latest" "$WORK/c1.out" '^latest: line [0-9][0-9]* · 2026-06-15 · 초기$'
check_contains "C1 counts" "$WORK/c1.out" '^work_items: active=1 open=0 closed=0 incomplete=1$'
check_contains "C1 next" "$WORK/c1.out" '^next: line .*W1 첫 작업$'

# C2: open 로그에 미완료가 없으면 closeout hint를 출력한다.
fx2="$WORK/c2.md"; write_log "$fx2"
"$LOG" check "$fx2" > "$WORK/c2.out"
check_contains "C2 closeout hint" "$WORK/c2.out" '^HINT closeout:'

# C3: decided 로그에 미완료 Work Item이 있으면 실패한다.
fx3="$WORK/c3.md"; write_log "$fx3" decided
{
    echo '- [ ] W1 남은 작업'
} >> "$fx3"
check_status "C3 decided 미완료 거부" 1 "$LOG" check "$fx3"
check_contains "C3 status error" "$WORK/out" '^ERROR status: decided 로그에 미완료 Work Items가 있습니다$'

# C4: 중복 W-id는 실패한다.
fx4="$WORK/c4.md"; write_log "$fx4"
{
    echo '- [ ] W1 A'
    echo '- [ ] W1 B'
} >> "$fx4"
check_status "C4 중복 W-id 거부" 1 "$LOG" check "$fx4"
check_contains "C4 duplicate error" "$WORK/out" '중복 Work Item id입니다: W1'

# C5: next pointer 복수는 실패한다.
fx5="$WORK/c5.md"; write_log "$fx5"
{
    echo '- [>] W1 A'
    echo '- [>] W2 B'
} >> "$fx5"
check_status "C5 next 복수 거부" 1 "$LOG" check "$fx5"
check_contains "C5 next error" "$WORK/out" '^ERROR next: next pointer가 2개입니다$'

# C6: --status는 LOG_DIR 아래 해당 status 로그를 점검한다.
LOG_DIR="$WORK/logs"; export LOG_DIR
mkdir -p "$LOG_DIR"
write_log "$LOG_DIR/open.md" open
write_log "$LOG_DIR/decided.md" decided
"$LOG" check --status decided > "$WORK/c6.out"
check_contains "C6 decided 포함" "$WORK/c6.out" '== .*/decided.md =='
if grep -q 'open.md' "$WORK/c6.out"; then ng "C6 open 제외"; cat "$WORK/c6.out"; else ok "C6 open 제외"; fi

# C7: latest 줄번호가 실제 날짜 heading 줄을 가리킨다(targeted Read용).
fx7="$WORK/c7.md"; write_log "$fx7"
"$LOG" items "$fx7" add "작업" --status active >/dev/null
expected_line=$(grep -n '^## 2026-06-15 · 초기$' "$fx7" | cut -d: -f1)
"$LOG" check "$fx7" > "$WORK/c7.out"
check_contains "C7 latest 줄번호 정확" "$WORK/c7.out" "^latest: line ${expected_line} · 2026-06-15 · 초기$"

# C8: 실제 최신 블록 뒤 fenced 날짜 heading은 latest로 오인하지 않는다.
fx8="$WORK/c8.md"; write_log "$fx8"
{
    echo '```markdown'
    echo '## 2026-12-31 · fenced 예시'
    echo '```'
} >> "$fx8"
real_line=$(grep -n '^## 2026-06-15 · 초기$' "$fx8" | cut -d: -f1)
"$LOG" check "$fx8" > "$WORK/c8.out"
check_contains "C8 fenced 날짜 미오인" "$WORK/c8.out" "^latest: line ${real_line} · 2026-06-15 · 초기$"

# C9: 점 포함 ID(W4.5)가 next pointer와 active로 인식된다.
fx9="$WORK/c9.md"; write_log "$fx9"
{
    echo '- [x] W1 이전 작업'
    echo '- [>] W4.5 점 포함 작업'
    echo '- [ ] W5 후속 작업'
} >> "$fx9"
"$LOG" check "$fx9" > "$WORK/c9.out"
check_contains "C9 W4.5 counts" "$WORK/c9.out" '^work_items: active=1 open=1 closed=1 incomplete=2$'
if "$LOG" check "$fx9" | grep -q '^next: line .*W4\.5 점 포함 작업'; then ok "C9 W4.5 next pointer"; else ng "C9 W4.5 next pointer"; fi

# C10: 하이픈 서브 ID(W4.5-1, W5-1)가 open/active/closed로 인식된다.
fx10="$WORK/c10.md"; write_log "$fx10"
{
    echo '- [>] W4.5 주 작업'
    echo '  - [ ] W4.5-1 서브 작업 A'
    echo '  - [x] W4.5-2 서브 작업 B'
    echo '- [ ] W5-1 하이픈 서브'
} >> "$fx10"
"$LOG" check "$fx10" > "$WORK/c10.out"
check_contains "C10 서브아이템 counts" "$WORK/c10.out" '^work_items: active=1 open=2 closed=1 incomplete=3$'

# C11: 점 하이픈 혼합 ID(W4.5-1) set 전이가 작동한다.
fx11="$WORK/c11.md"; write_log "$fx11"
{
    echo '- [>] W4.5-1 혼합 작업'
} >> "$fx11"
"$LOG" items "$fx11" set --id W4.5-1 --status completed --expect "혼합 작업" >/dev/null
check_contains "C11 W4.5-1 completed" "$fx11" '^- \[x\] W4\.5-1 혼합 작업$'

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
