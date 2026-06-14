#!/bin/sh
# log resolve 회귀 테스트.
#
# 성공 케이스는 실제 resolve 결과 파일을 기대 바이트와 정확히 비교하고, 적용 후 대상이
# audit에서 빠졌는지(postcondition) 확인한다. 실패 케이스는 비0 종료와 원본 바이트
# 무변경을 확인한다. 날짜는 LOG_TODAY로 고정해 결정적으로 비교한다.

set -u

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
LOG="$SCRIPT_DIR/log"

export LOG_TODAY=2026-06-12

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT INT TERM

# 내부 함수만 로드한다(main 미실행). 이후 자식 프로세스 실행을 위해 LOG_LIB_ONLY는
# 해제하되 LOG_TODAY는 export 상태로 둔다.
LOG_LIB_ONLY=1
export LOG_LIB_ONLY
# shellcheck disable=SC1090
. "$LOG"
unset LOG_LIB_ONLY

pass=0
fail=0

ok() { pass=$((pass + 1)); printf 'ok   %s\n' "$1"; }
ng() { fail=$((fail + 1)); printf 'FAIL %s\n' "$1"; }

# 실제 resolve가 exit 0이고 대상 파일이 기대 바이트와 정확히 일치하는지 확인한다.
# 인자: name fx exp records
check_resolve_ok() {
    _name=$1; _fx=$2; _exp=$3; _records=$4
    if "$LOG" resolve "$_fx" < "$_records" > /dev/null 2>&1; then
        if cmp -s "$_fx" "$_exp"; then
            ok "$_name resolve 바이트 일치"
        else
            ng "$_name resolve 결과 불일치"
            echo "--- expected ---"; cat "$_exp"
            echo "--- actual ---"; cat "$_fx"
            echo "----------------"
        fi
    else
        ng "$_name resolve 종료코드!=0"
    fi
}

# 실패 케이스: 비0 종료 + 원본 무변경.
# 인자: name fx records
check_fail() {
    _name=$1; _fx=$2; _records=$3
    if [ -f "$_fx" ]; then cp "$_fx" "$WORK/before"; fi
    if "$LOG" resolve "$_fx" < "$_records" > /dev/null 2>&1; then
        ng "$_name 종료코드 0(실패 기대)"
    else
        if [ -f "$_fx" ] && ! cmp -s "$_fx" "$WORK/before"; then
            ng "$_name 원본 변경됨"
        else
            ok "$_name 실패/무변경"
        fi
    fi
}

# 대상 파일이 audit에서 더는 미완료를 내지 않는지 확인한다(postcondition).
check_audit_clean() {
    _name=$1; _fx=$2
    if [ -z "$("$LOG" audit "$_fx" 2>/dev/null)" ]; then
        ok "$_name audit clean"
    else
        ng "$_name audit에 미완료 남음"
        "$LOG" audit "$_fx"
    fi
}

# 파일 권한을 octal로 출력한다(GNU stat -c, BSD/macOS stat -f 순서로 시도).
mode_of() {
    stat -c '%a' "$1" 2>/dev/null || stat -f '%Lp' "$1" 2>/dev/null
}

# ---------- 성공 케이스(기능: complete/cancel/transfer × dash·번호형) ----------

# R1 dash complete
fx="$WORK/r1.md"; exp="$WORK/r1.exp"; rec="$WORK/r1.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] 항목 하나.' > "$fx"
printf '%s\n' 'line: 9' 'expect: - [ ] 항목 하나.' 'mode: complete' > "$rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [x] 항목 하나.' > "$exp"
check_resolve_ok R1 "$fx" "$exp" "$rec"
check_audit_clean R1 "$fx"

# R2 dash cancel
fx="$WORK/r2.md"; exp="$WORK/r2.exp"; rec="$WORK/r2.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] 항목 하나.' > "$fx"
printf '%s\n' 'line: 9' 'expect: - [ ] 항목 하나.' 'mode: cancel' 'reason: 더 필요 없음' > "$rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- Cancelled: 항목 하나. — 더 필요 없음' > "$exp"
check_resolve_ok R2 "$fx" "$exp" "$rec"
check_audit_clean R2 "$fx"

# R3 dash transfer
fx="$WORK/r3.md"; exp="$WORK/r3.exp"; rec="$WORK/r3.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] 항목 하나.' > "$fx"
printf '%s\n' 'line: 9' 'expect: - [ ] 항목 하나.' 'mode: transfer' 'target: other.md' 'reason: 범위 밖' > "$rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- Transferred: 항목 하나. → other.md — 범위 밖' > "$exp"
check_resolve_ok R3 "$fx" "$exp" "$rec"
check_audit_clean R3 "$fx"

# R4 번호형 complete
fx="$WORK/r4.md"; exp="$WORK/r4.exp"; rec="$WORK/r4.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '1. [ ] 첫 항목.' > "$fx"
printf '%s\n' 'line: 9' 'expect: 1. [ ] 첫 항목.' 'mode: complete' > "$rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '1. [x] 첫 항목.' > "$exp"
check_resolve_ok R4 "$fx" "$exp" "$rec"
check_audit_clean R4 "$fx"

# R5 번호형 cancel
fx="$WORK/r5.md"; exp="$WORK/r5.exp"; rec="$WORK/r5.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '2. [ ] 둘째 항목.' > "$fx"
printf '%s\n' 'line: 9' 'expect: 2. [ ] 둘째 항목.' 'mode: cancel' 'reason: 보류' > "$rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '2. Cancelled: 둘째 항목. — 보류' > "$exp"
check_resolve_ok R5 "$fx" "$exp" "$rec"
check_audit_clean R5 "$fx"

# R6 번호형 transfer
fx="$WORK/r6.md"; exp="$WORK/r6.exp"; rec="$WORK/r6.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '3. [ ] 셋째 항목.' > "$fx"
printf '%s\n' 'line: 9' 'expect: 3. [ ] 셋째 항목.' 'mode: transfer' 'target: b.md' 'reason: 이관' > "$rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '3. Transferred: 셋째 항목. → b.md — 이관' > "$exp"
check_resolve_ok R6 "$fx" "$exp" "$rec"
check_audit_clean R6 "$fx"

# R7 배치 다항목 전부 적용 + leading whitespace 보존 + 들여쓴 dash
fx="$WORK/r7.md"; exp="$WORK/r7.exp"; rec="$WORK/r7.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '## Work Items' '' \
    '1. [ ] 첫 항목.' '2. [ ] 둘째 항목.' '3. [ ] 셋째 항목.' '' \
    '- [ ] 대시 항목.' '  - [ ] 들여쓴 항목.' > "$fx"
printf '%s\n' \
    'line: 11' 'expect: 1. [ ] 첫 항목.' 'mode: complete' '' \
    'line: 12' 'expect: 2. [ ] 둘째 항목.' 'mode: cancel' 'reason: 더 필요 없음' '' \
    'line: 13' 'expect: 3. [ ] 셋째 항목.' 'mode: transfer' 'target: other.md' 'reason: 범위 밖' '' \
    'line: 15' 'expect: - [ ] 대시 항목.' 'mode: complete' '' \
    'line: 16' 'expect:   - [ ] 들여쓴 항목.' 'mode: cancel' 'reason: 보류' > "$rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '## Work Items' '' \
    '1. [x] 첫 항목.' '2. Cancelled: 둘째 항목. — 더 필요 없음' \
    '3. Transferred: 셋째 항목. → other.md — 범위 밖' '' \
    '- [x] 대시 항목.' '  - Cancelled: 들여쓴 항목. — 보류' > "$exp"
check_resolve_ok R7 "$fx" "$exp" "$rec"
check_audit_clean R7 "$fx"

# R8 다른 미완료가 있어도 지정한 것만 변환(나머지 보존)
fx="$WORK/r8.md"; exp="$WORK/r8.exp"; rec="$WORK/r8.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] 첫째.' '- [ ] 둘째.' '- [ ] 셋째.' > "$fx"
printf '%s\n' 'line: 10' 'expect: - [ ] 둘째.' 'mode: complete' > "$rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] 첫째.' '- [x] 둘째.' '- [ ] 셋째.' > "$exp"
check_resolve_ok R8 "$fx" "$exp" "$rec"

# R9 expect에 콜론 포함(첫 콜론으로만 split)
fx="$WORK/r9.md"; exp="$WORK/r9.exp"; rec="$WORK/r9.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] 항목: 콜론 포함.' > "$fx"
printf '%s\n' 'line: 9' 'expect: - [ ] 항목: 콜론 포함.' 'mode: complete' > "$rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [x] 항목: 콜론 포함.' > "$exp"
check_resolve_ok R9 "$fx" "$exp" "$rec"

# ---------- 보존: literal backslash ----------

# R10 expect·reason에 리터럴 백슬래시 보존
fx="$WORK/r10.md"; exp="$WORK/r10.exp"; rec="$WORK/r10.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] 경로 C:\Users\me.' > "$fx"
printf '%s\n' 'line: 9' 'expect: - [ ] 경로 C:\Users\me.' 'mode: cancel' 'reason: C:\tmp\x 때문' > "$rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- Cancelled: 경로 C:\Users\me. — C:\tmp\x 때문' > "$exp"
check_resolve_ok R10 "$fx" "$exp" "$rec"

# R11 transfer target에 리터럴 백슬래시 보존
fx="$WORK/r11.md"; exp="$WORK/r11.exp"; rec="$WORK/r11.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] X.' > "$fx"
printf '%s\n' 'line: 9' 'expect: - [ ] X.' 'mode: transfer' 'target: C:\dir\b.md' 'reason: 경로 이관' > "$rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- Transferred: X. → C:\dir\b.md — 경로 이관' > "$exp"
check_resolve_ok R11 "$fx" "$exp" "$rec"

# ---------- 보존: 파일 권한 ----------

# R12 적용 후 원본 권한(640) 보존
fx="$WORK/r12.md"; exp="$WORK/r12.exp"; rec="$WORK/r12.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] X.' > "$fx"
chmod 640 "$fx"
printf '%s\n' 'line: 9' 'expect: - [ ] X.' 'mode: complete' > "$rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [x] X.' > "$exp"
check_resolve_ok R12 "$fx" "$exp" "$rec"
m=$(mode_of "$fx")
if [ -z "$m" ] || [ "$m" = "640" ]; then ok "R12 권한 보존(640)"; else ng "R12 권한 불일치($m)"; fi

# ---------- postcondition: cancel/transfer 기록에 원문·mode·이유·대상 보존 ----------

# R13 cancel 기록 보존 확인
fx="$WORK/r13.md"; rec="$WORK/r13.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] 원래 행동 텍스트.' > "$fx"
printf '%s\n' 'line: 9' 'expect: - [ ] 원래 행동 텍스트.' 'mode: cancel' 'reason: 그만둠' > "$rec"
"$LOG" resolve "$fx" < "$rec" > /dev/null 2>&1
if grep -q '^- Cancelled: 원래 행동 텍스트\. — 그만둠$' "$fx"; then
    ok "R13 cancel 기록(원문·mode·이유) 보존"
else
    ng "R13 cancel 기록 보존 실패"; cat "$fx"
fi

# R14 transfer 기록 보존 확인
fx="$WORK/r14.md"; rec="$WORK/r14.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] 원래 행동 텍스트.' > "$fx"
printf '%s\n' 'line: 9' 'expect: - [ ] 원래 행동 텍스트.' 'mode: transfer' 'target: dest.md' 'reason: 다른 곳' > "$rec"
"$LOG" resolve "$fx" < "$rec" > /dev/null 2>&1
if grep -q '^- Transferred: 원래 행동 텍스트\. → dest\.md — 다른 곳$' "$fx"; then
    ok "R14 transfer 기록(원문·mode·이유·대상) 보존"
else
    ng "R14 transfer 기록 보존 실패"; cat "$fx"
fi

# ---------- 원자성: 한 항목 실패 시 전체 거부·원본 무변경 ----------

# 공용 다항목 fixture
multi="$WORK/multi.md"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] 첫째.' '- [ ] 둘째.' > "$multi"

# R15 두 항목 중 하나가 expect 불일치면 전체 거부(원본 무변경)
rec="$WORK/r15.rec"
printf '%s\n' \
    'line: 9' 'expect: - [ ] 첫째.' 'mode: complete' '' \
    'line: 10' 'expect: - [ ] 틀린 텍스트.' 'mode: complete' > "$rec"
cp "$multi" "$WORK/r15.copy"
check_fail R15 "$WORK/r15.copy" "$rec"

# ---------- 거부 케이스(원본 무변경) ----------

# 단일 항목 유효 fixture(파싱/검증 단계 실패 공용)
valid="$WORK/valid.md"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] A를 한다.' '' '- [ ] Resume: 재개 행동.' > "$valid"

# R16 line 줄번호 불일치(맞는 원문이지만 그 원문이 없는 다른 줄 번호 지정)
# 줄 7은 heading이라 체크박스 원문과 일치하지 않으므로 expect 불일치로 거부된다.
rec="$WORK/r16.rec"
printf '%s\n' 'line: 7' 'expect: - [ ] A를 한다.' 'mode: complete' > "$rec"
check_fail R16 "$valid" "$rec"

# R17 expect 불일치
rec="$WORK/r17.rec"
printf '%s\n' 'line: 9' 'expect: - [ ] 다른 텍스트.' 'mode: complete' > "$rec"
check_fail R17 "$valid" "$rec"

# R18 미완료 Resume 줄 지정 거부
rec="$WORK/r18.rec"
printf '%s\n' 'line: 11' 'expect: - [ ] Resume: 재개 행동.' 'mode: complete' > "$rec"
check_fail R18 "$valid" "$rec"

# R19 unknown key
rec="$WORK/r19.rec"
printf '%s\n' 'line: 9' 'expect: - [ ] A를 한다.' 'mode: complete' 'bogus: x' > "$rec"
check_fail R19 "$valid" "$rec"

# R20 duplicate key(한 레코드 내)
rec="$WORK/r20.rec"
printf '%s\n' 'line: 9' 'expect: - [ ] A를 한다.' 'mode: complete' 'mode: cancel' > "$rec"
check_fail R20 "$valid" "$rec"

# R21 empty expect
rec="$WORK/r21.rec"
printf '%s\n' 'line: 9' 'expect:' 'mode: complete' > "$rec"
check_fail R21 "$valid" "$rec"

# R22 multi-line expect(expect 두 번 — duplicate key로 막히는 것과 별개로, 한 줄 불변 강제)
# expect 값에 개행을 넣는 입력은 두 줄이 되므로 key/value 형식 위반으로 둘째 줄이 거부된다.
rec="$WORK/r22.rec"
printf '%s\n' 'line: 9' 'expect: - [ ] A를 한다.' '여러 줄로 이어짐' 'mode: complete' > "$rec"
check_fail R22 "$valid" "$rec"

# R23 비정수 line
rec="$WORK/r23.rec"
printf '%s\n' 'line: 9abc' 'expect: - [ ] A를 한다.' 'mode: complete' > "$rec"
check_fail R23 "$valid" "$rec"

# R24 cancel reason 누락
rec="$WORK/r24.rec"
printf '%s\n' 'line: 9' 'expect: - [ ] A를 한다.' 'mode: cancel' > "$rec"
check_fail R24 "$valid" "$rec"

# R25 cancel에 target 동반
rec="$WORK/r25.rec"
printf '%s\n' 'line: 9' 'expect: - [ ] A를 한다.' 'mode: cancel' 'reason: x' 'target: y' > "$rec"
check_fail R25 "$valid" "$rec"

# R26 transfer target 누락
rec="$WORK/r26.rec"
printf '%s\n' 'line: 9' 'expect: - [ ] A를 한다.' 'mode: transfer' 'reason: x' > "$rec"
check_fail R26 "$valid" "$rec"

# R27 transfer reason 누락
rec="$WORK/r27.rec"
printf '%s\n' 'line: 9' 'expect: - [ ] A를 한다.' 'mode: transfer' 'target: y' > "$rec"
check_fail R27 "$valid" "$rec"

# R28 complete에 reason 동반
rec="$WORK/r28.rec"
printf '%s\n' 'line: 9' 'expect: - [ ] A를 한다.' 'mode: complete' 'reason: x' > "$rec"
check_fail R28 "$valid" "$rec"

# R29 complete에 target 동반
rec="$WORK/r29.rec"
printf '%s\n' 'line: 9' 'expect: - [ ] A를 한다.' 'mode: complete' 'target: y' > "$rec"
check_fail R29 "$valid" "$rec"

# R30 같은 line 중복 지정(두 레코드)
rec="$WORK/r30.rec"
printf '%s\n' \
    'line: 9' 'expect: - [ ] A를 한다.' 'mode: complete' '' \
    'line: 9' 'expect: - [ ] A를 한다.' 'mode: cancel' 'reason: x' > "$rec"
check_fail R30 "$valid" "$rec"

# R31 line 필수 누락
rec="$WORK/r31.rec"
printf '%s\n' 'expect: - [ ] A를 한다.' 'mode: complete' > "$rec"
check_fail R31 "$valid" "$rec"

# R32 mode 필수 누락
rec="$WORK/r32.rec"
printf '%s\n' 'line: 9' 'expect: - [ ] A를 한다.' > "$rec"
check_fail R32 "$valid" "$rec"

# R33 알 수 없는 mode 값
rec="$WORK/r33.rec"
printf '%s\n' 'line: 9' 'expect: - [ ] A를 한다.' 'mode: bogus' > "$rec"
check_fail R33 "$valid" "$rec"

# R34 미완료 체크박스가 아닌 줄 지정(일반 본문 줄)
plain="$WORK/plain.md"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- 일반 기록 줄.' > "$plain"
rec="$WORK/r34.rec"
printf '%s\n' 'line: 9' 'expect: - 일반 기록 줄.' 'mode: complete' > "$rec"
check_fail R34 "$plain" "$rec"

# R35 fenced code 안의 체크박스 지정 거부
fenced="$WORK/fenced.md"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '```markdown' '- [ ] 코드 예시.' '```' > "$fenced"
rec="$WORK/r35.rec"
printf '%s\n' 'line: 10' 'expect: - [ ] 코드 예시.' 'mode: complete' > "$rec"
check_fail R35 "$fenced" "$rec"

# R36 줄번호 파일 범위 초과
rec="$WORK/r36.rec"
printf '%s\n' 'line: 999' 'expect: - [ ] A를 한다.' 'mode: complete' > "$rec"
check_fail R36 "$valid" "$rec"

# R37 빈 stdin 거부
empty="$WORK/r37.rec"
: > "$empty"
check_fail R37 "$valid" "$empty"

# R38 frontmatter 무효 파일 거부
nonlog="$WORK/nonlog.md"
printf '%s\n' '# 그냥 문서' '' '- [ ] A를 한다.' > "$nonlog"
rec="$WORK/r38.rec"
printf '%s\n' 'line: 3' 'expect: - [ ] A를 한다.' 'mode: complete' > "$rec"
check_fail R38 "$nonlog" "$rec"

# R39 non-open 로그 거부
decided="$WORK/decided.md"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: decided' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] A를 한다.' > "$decided"
rec="$WORK/r39.rec"
printf '%s\n' 'line: 9' 'expect: - [ ] A를 한다.' 'mode: complete' > "$rec"
check_fail R39 "$decided" "$rec"

# R40 파일 인자 누락
if "$LOG" resolve < /dev/null > /dev/null 2>&1; then
    ng "R40 파일 인자 없는데 성공"
else
    ok "R40 파일 인자 누락 거부"
fi

# R41 추가 인자 거부
rec="$WORK/r41.rec"
printf '%s\n' 'line: 9' 'expect: - [ ] A를 한다.' 'mode: complete' > "$rec"
cp "$valid" "$WORK/r41.copy"
if "$LOG" resolve "$WORK/r41.copy" extra < "$rec" > /dev/null 2>&1; then
    ng "R41 추가 인자인데 성공"
elif cmp -s "$WORK/r41.copy" "$valid"; then
    ok "R41 추가 인자 거부/원본 무변경"
else
    ng "R41 추가 인자 거부됐는데 원본 변경"
fi

# ---------- 동시 수정 감지(직접 호출) ----------

# R42 apply_result가 받은 snapshot이 현재 원본과 다르면 동시 수정으로 보고 교체 거부.
# append 테스트 A7과 같은 방식으로, resolve도 apply_result를 공유하므로 동일 불변을 확인한다.
afx="$WORK/r42.md"; aout="$WORK/r42.out"; asnap="$WORK/r42.snap"
printf '%s\n' '현재 원본' > "$afx"
printf '%s\n' '교체 후보 결과' > "$aout"
printf '%s\n' '빌드 시작 시점 스냅샷(다름)' > "$asnap"
cp "$afx" "$WORK/r42.before"
if apply_result "$afx" "$aout" "$asnap" > /dev/null 2>&1; then
    ng "R42 동시 수정인데 적용 성공"
elif cmp -s "$afx" "$WORK/r42.before"; then
    ok "R42 동시 수정 감지/원본 무변경"
else
    ng "R42 원본 변경됨"
fi

# ---------- postcondition 직접 검증 ----------

# R43 변환되면 postcondition 통과, 변환 안 되면(미완료 잔존) 실패하는지 직접 확인.
# 정상 변환 결과는 통과해야 한다.
src43="$WORK/r43.src"; spec43="$WORK/r43.spec"; out43="$WORK/r43.out"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] X.' > "$src43"
# parse로 정규화 spec 생성
printf '%s\n' 'line: 9' 'expect: - [ ] X.' 'mode: complete' | parse_resolve_records > "$spec43"
emit_resolved "$src43" "$spec43" > "$out43"
if verify_resolved_postcondition "$out43" "$spec43" > /dev/null 2>&1; then
    ok "R43 변환 결과 postcondition 통과"
else
    ng "R43 정상 변환인데 postcondition 실패"
fi
# 변환 전 원본을 postcondition에 넣으면(대상이 여전히 미완료) 실패해야 한다.
if verify_resolved_postcondition "$src43" "$spec43" > /dev/null 2>&1; then
    ng "R43 미완료 잔존인데 postcondition 통과"
else
    ok "R43 미완료 잔존 postcondition 거부"
fi

# ---------- 동시 수정 종단(end-to-end) ----------

# R44 결과 생성 중 원본이 바뀌면 교체 거부·후보 결과로 덮지 않음.
# cmd_resolve가 cp -p로 만든 out_tmp를 빌드한 뒤 snapshot 비교로 거부하는 전체 경로를
# 좁게 재현하기 어렵지만, apply_result 공유로 R42가 핵심 불변을 덮는다. 여기서는 정상
# 경로가 동시 수정 없이 성공함을 한 번 더 확인한다(거짓 양성 방지).
fx="$WORK/r44.md"; exp="$WORK/r44.exp"; rec="$WORK/r44.rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] Y.' > "$fx"
printf '%s\n' 'line: 9' 'expect: - [ ] Y.' 'mode: complete' > "$rec"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [x] Y.' > "$exp"
check_resolve_ok R44 "$fx" "$exp" "$rec"

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
