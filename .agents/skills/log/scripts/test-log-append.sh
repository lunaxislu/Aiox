#!/bin/sh
# log append 회귀 테스트.

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
        echo '- [>] W1 첫 작업'
        echo
        echo '## 2026-06-14 · 초기'
        echo
        echo '- 기존 기록'
    } > "$file"
}

check_ok() {
    name=$1 fx=$2 body=$3 exp=$4
    if "$LOG" append "$fx" "진행 기록" < "$body" > "$WORK/out" 2>&1; then
        if cmp -s "$fx" "$exp"; then ok "$name"; else ng "$name 결과 불일치"; cat "$fx"; fi
    else
        ng "$name 종료코드!=0"
        cat "$WORK/out"
    fi
}

check_fail_unchanged() {
    name=$1 fx=$2 body=$3
    cp "$fx" "$WORK/before"
    if "$LOG" append "$fx" "진행 기록" < "$body" > "$WORK/out" 2>&1; then
        ng "$name 종료코드 0(실패 기대)"
    elif cmp -s "$fx" "$WORK/before"; then
        ok "$name 실패/무변경"
    else
        ng "$name 원본 변경됨"
        cat "$WORK/out"
    fi
}

# A1: 본문을 날짜 블록으로 추가하고 기존 Work Items를 유지한다.
fx="$WORK/a1.md"; body="$WORK/a1.body"; exp="$WORK/a1.exp"
write_log "$fx"
printf '%s\n' '@codex' '' '- 새 기록' > "$body"
{
    echo '---'; echo 'topic: 테스트'; echo 'description: 설명'; echo 'status: open'; echo '---'; echo
    echo '## Work Items'; echo '- [>] W1 첫 작업'; echo
    echo '## 2026-06-14 · 초기'; echo; echo '- 기존 기록'; echo
    echo '## 2026-06-15 · 진행 기록'; echo; echo '@codex'; echo; echo '- 새 기록'
} > "$exp"
check_ok "A1 append" "$fx" "$body" "$exp"

# A2: 빈 본문은 거부한다.
fx="$WORK/a2.md"; body="$WORK/a2.body"
write_log "$fx"
: > "$body"
check_fail_unchanged "A2 빈 본문 거부" "$fx" "$body"

# A3: 본문에 next pointer를 직접 쓰면 거부한다.
fx="$WORK/a3.md"; body="$WORK/a3.body"
write_log "$fx"
printf '%s\n' '- [>] W2 직접 next' > "$body"
check_fail_unchanged "A3 직접 next 거부" "$fx" "$body"

# A4: fenced 예시는 next pointer로 보지 않는다.
fx="$WORK/a4.md"; body="$WORK/a4.body"
write_log "$fx"
printf '%s\n' '```markdown' '- [>] W2 예시' '```' > "$body"
if "$LOG" append "$fx" "예시" < "$body" > /dev/null 2>&1; then ok "A4 fenced 예시 허용"; else ng "A4 fenced 예시 거부"; fi

# A5: decided 로그에는 append하지 않는다.
fx="$WORK/a5.md"; body="$WORK/a5.body"
write_log "$fx"
sed 's/status: open/status: decided/' "$fx" > "$WORK/a5.tmp"
mv "$WORK/a5.tmp" "$fx"
printf '%s\n' '- 기록' > "$body"
check_fail_unchanged "A5 decided 거부" "$fx" "$body"

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
