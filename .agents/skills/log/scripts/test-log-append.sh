#!/bin/sh
# log append 회귀 테스트.
#
# 성공 케이스는 내부 result-building 경로(build_result)의 최종 바이트를 기대값과
# 바이트 단위로 비교하고 실제 append 결과도 확인한다. 실패 케이스는 비0 종료와
# 원본 바이트 무변경을 확인한다.
#
# 날짜는 LOG_TODAY로 고정해 결정적으로 비교한다.

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

# build_result의 최종 바이트가 기대 파일과 같은지 비교한다.
# 인자: name fx exp topic mode reason has_resume resume body
check_build() {
    _name=$1; _fx=$2; _exp=$3; _topic=$4; _mode=$5; _reason=$6; _hasresume=$7; _resume=$8; _body=$9
    build_result "$_fx" "$_topic" "$_mode" "$_reason" "$_hasresume" "$_resume" "$_body" > "$WORK/actual"
    if cmp -s "$WORK/actual" "$_exp"; then
        ok "$_name oracle"
    else
        ng "$_name oracle"
        echo "--- expected ---"; cat "$_exp"
        echo "--- actual ---"; cat "$WORK/actual"
        echo "----------------"
    fi
}

# 실패 케이스: 비0 종료 + 원본 무변경.
# 인자: name fx body -- (이후 append 인자 전체)
check_fail() {
    _name=$1; _fx=$2; _body=$3; shift 3
    if [ -f "$_fx" ]; then cp "$_fx" "$WORK/before"; fi
    if "$LOG" append "$@" < "$_body" > /dev/null 2>&1; then
        ng "$_name 종료코드 0(실패 기대)"
    else
        if [ -f "$_fx" ] && ! cmp -s "$_fx" "$WORK/before"; then
            ng "$_name 원본 변경됨"
        else
            ok "$_name 실패/무변경"
        fi
    fi
}

# 실제 append가 exit 0이고 대상 파일이 기대 바이트와 정확히 일치하는지 확인한다.
# 인자: name fx exp body -- (이후 append 인자)
check_append_ok() {
    _name=$1; _fx=$2; _exp=$3; _body=$4; shift 4
    if "$LOG" append "$@" < "$_body" > /dev/null 2>&1; then
        if cmp -s "$_fx" "$_exp"; then
            ok "$_name append 바이트 일치"
        else
            ng "$_name append 결과 불일치"
            echo "--- expected ---"; cat "$_exp"
            echo "--- actual ---"; cat "$_fx"
            echo "----------------"
        fi
    else
        ng "$_name append 종료코드!=0"
    fi
}

# 파일 권한을 octal로 출력한다(GNU stat -c, BSD/macOS stat -f 순서로 시도).
# 둘 다 실패하는 환경에서는 빈 값을 출력하고, 호출부는 권한 단언을 건너뛴다.
mode_of() {
    stat -c '%a' "$1" 2>/dev/null || stat -f '%Lp' "$1" 2>/dev/null
}

# ---------- 성공 케이스 ----------

# T1 complete + Resume
fx="$WORK/t1.md"; exp="$WORK/t1.exp"; body="$WORK/t1.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- 무언가 했다.' '' \
    '- [ ] Resume: A와 B를 구현한다.' > "$fx"
printf '%s\n' '@codex' '' '- 통합 작업을 마쳤다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- 무언가 했다.' '' \
    '- [x] Resume: A와 B를 구현한다.' '' \
    '## 2026-06-12 · 새 블록 주제' '' '@codex' '' '- 통합 작업을 마쳤다.' '' \
    '- [ ] Resume: 통합 테스트를 실행한다' > "$exp"
check_build T1 "$fx" "$exp" "새 블록 주제" complete "" 1 "통합 테스트를 실행한다" "$body"
check_append_ok T1 "$fx" "$exp" "$body" "$fx" "새 블록 주제" --complete-resume --resume "통합 테스트를 실행한다"

# T2 complete, Resume 없음
fx="$WORK/t2.md"; exp="$WORK/t2.exp"; body="$WORK/t2.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: A와 B를 구현한다.' > "$fx"
printf '%s\n' '@codex' '' '- 마무리했다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [x] Resume: A와 B를 구현한다.' '' \
    '## 2026-06-12 · 후속' '' '@codex' '' '- 마무리했다.' > "$exp"
check_build T2 "$fx" "$exp" "후속" complete "" 0 "" "$body"
check_append_ok T2 "$fx" "$exp" "$body" "$fx" "후속" --complete-resume

# T3 부분 완료 대체
fx="$WORK/t3.md"; exp="$WORK/t3.exp"; body="$WORK/t3.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: A와 B를 구현한다.' > "$fx"
printf '%s\n' '@codex' '' '- A는 완료했다. 남은 B와 C는 새 행동으로 옮긴다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' \
    '- Cancelled Resume: A와 B를 구현한다. — A는 완료했고 남은 범위를 아래 행동으로 대체' '' \
    '## 2026-06-12 · 부분 완료' '' '@codex' '' \
    '- A는 완료했다. 남은 B와 C는 새 행동으로 옮긴다.' '' \
    '- [ ] Resume: B와 C를 구현한다' > "$exp"
check_build T3 "$fx" "$exp" "부분 완료" replace "A는 완료했고 남은 범위를 아래 행동으로 대체" 1 "B와 C를 구현한다" "$body"
check_append_ok T3 "$fx" "$exp" "$body" "$fx" "부분 완료" --replace-resume "A는 완료했고 남은 범위를 아래 행동으로 대체" --resume "B와 C를 구현한다"

# T4 범위 확장 대체
fx="$WORK/t4.md"; exp="$WORK/t4.exp"; body="$WORK/t4.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: A 구현 후 B를 구현한다.' > "$fx"
printf '%s\n' '@codex' '' '- Revised: A 후 B -> A 후 B 후 C -> C 요구 추가.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' \
    '- Cancelled Resume: A 구현 후 B를 구현한다. — C가 추가되어 아래 행동으로 대체' '' \
    '## 2026-06-12 · 범위 확장' '' '@codex' '' \
    '- Revised: A 후 B -> A 후 B 후 C -> C 요구 추가.' '' \
    '- [ ] Resume: A 구현 후 B 구현 후 C를 구현한다' > "$exp"
check_build T4 "$fx" "$exp" "범위 확장" replace "C가 추가되어 아래 행동으로 대체" 1 "A 구현 후 B 구현 후 C를 구현한다" "$body"
check_append_ok T4 "$fx" "$exp" "$body" "$fx" "범위 확장" --replace-resume "C가 추가되어 아래 행동으로 대체" --resume "A 구현 후 B 구현 후 C를 구현한다"

# T5 본문만 append, 기존 Resume 유지
fx="$WORK/t5.md"; exp="$WORK/t5.exp"; body="$WORK/t5.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: A와 B를 구현한다.' > "$fx"
printf '%s\n' '@codex' '' '- 관련 자료를 확인했다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: A와 B를 구현한다.' '' \
    '## 2026-06-12 · 조사' '' '@codex' '' '- 관련 자료를 확인했다.' > "$exp"
check_build T5 "$fx" "$exp" "조사" "" "" 0 "" "$body"
check_append_ok T5 "$fx" "$exp" "$body" "$fx" "조사"

# T6 multiline 연속 줄 보존
fx="$WORK/t6.md"; exp="$WORK/t6.exp"; body="$WORK/t6.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: 첫 행동을 한다.' \
    '  부가 설명 줄.' '  또 다른 줄.' > "$fx"
printf '%s\n' '@codex' '' '- 끝냈다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [x] Resume: 첫 행동을 한다.' \
    '  부가 설명 줄.' '  또 다른 줄.' '' \
    '## 2026-06-12 · 연속줄' '' '@codex' '' '- 끝냈다.' > "$exp"
check_build T6 "$fx" "$exp" "연속줄" complete "" 0 "" "$body"
check_append_ok T6 "$fx" "$exp" "$body" "$fx" "연속줄" --complete-resume

# T7 한글 주제/날짜 heading
fx="$WORK/t7.md"; exp="$WORK/t7.exp"; body="$WORK/t7.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- 시작 기록.' > "$fx"
printf '%s\n' '@codex' '' '- 한글 본문 기록이다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- 시작 기록.' '' \
    '## 2026-06-12 · 한글 주제 검증' '' '@codex' '' '- 한글 본문 기록이다.' > "$exp"
check_build T7 "$fx" "$exp" "한글 주제 검증" "" "" 0 "" "$body"
check_append_ok T7 "$fx" "$exp" "$body" "$fx" "한글 주제 검증"

# T8 원본 끝에 trailing newline 없음
fx="$WORK/t8.md"; exp="$WORK/t8.exp"; body="$WORK/t8.body"
{ printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' ; printf '%s' '- [ ] Resume: 마지막 행동이다.'; } > "$fx"
printf '%s\n' '@codex' '' '- 이어서 했다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [x] Resume: 마지막 행동이다.' '' \
    '## 2026-06-12 · 개행없음 후속' '' '@codex' '' '- 이어서 했다.' > "$exp"
check_build T8 "$fx" "$exp" "개행없음 후속" complete "" 0 "" "$body"
check_append_ok T8 "$fx" "$exp" "$body" "$fx" "개행없음 후속" --complete-resume

# T9 fenced 가짜 Resume 무시, 실제 마지막 Resume 선택
fx="$WORK/t9.md"; exp="$WORK/t9.exp"; body="$WORK/t9.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '```markdown' '- [ ] Resume: 가짜(코드 예시).' '```' '' \
    '- [ ] Resume: 진짜 행동이다.' > "$fx"
printf '%s\n' '@codex' '' '- 진짜를 닫는다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '```markdown' '- [ ] Resume: 가짜(코드 예시).' '```' '' \
    '- [x] Resume: 진짜 행동이다.' '' \
    '## 2026-06-12 · 펜스 무시' '' '@codex' '' '- 진짜를 닫는다.' > "$exp"
check_build T9 "$fx" "$exp" "펜스 무시" complete "" 0 "" "$body"
check_append_ok T9 "$fx" "$exp" "$body" "$fx" "펜스 무시" --complete-resume

# T10 들여쓰기 보존
fx="$WORK/t10.md"; exp="$WORK/t10.exp"; body="$WORK/t10.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '  - [ ] Resume: 들여쓴 행동이다.' > "$fx"
printf '%s\n' '@codex' '' '- 닫았다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '  - [x] Resume: 들여쓴 행동이다.' '' \
    '## 2026-06-12 · 들여쓰기' '' '@codex' '' '- 닫았다.' > "$exp"
check_build T10 "$fx" "$exp" "들여쓰기" complete "" 0 "" "$body"
check_append_ok T10 "$fx" "$exp" "$body" "$fx" "들여쓰기" --complete-resume

# ---------- 실패 케이스(원본 무변경) ----------

# 유효 로그(다음 있음) — 파싱/검증 단계 실패 케이스 공용
valid="$WORK/valid.md"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: A를 한다.' > "$valid"
gbody="$WORK/good.body"
printf '%s\n' '@codex' '' '- 본문.' > "$gbody"

# T11 complete + replace 동시
check_fail T11 "$valid" "$gbody" "$valid" "주제" --complete-resume --replace-resume "이유"
# T12 replace인데 Resume 없음
check_fail T12 "$valid" "$gbody" "$valid" "주제" --replace-resume "이유"
# T13 replace reason 빈 값
check_fail T13 "$valid" "$gbody" "$valid" "주제" --replace-resume "" --resume "B"
# T14 resolve 없음 + Resume
check_fail T14 "$valid" "$gbody" "$valid" "주제" --resume "B"
# T15 resolve 타깃 없음
notarget="$WORK/notarget.md"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- 다음 항목 없음.' > "$notarget"
check_fail T15 "$notarget" "$gbody" "$notarget" "주제" --complete-resume
# T16 non-open 로그
decided="$WORK/decided.md"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: decided' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: A를 한다.' > "$decided"
check_fail T16 "$decided" "$gbody" "$decided" "주제" --complete-resume
# T17 비로그 파일(frontmatter 없음)
nonlog="$WORK/nonlog.md"
printf '%s\n' '# 그냥 문서' '' '- [ ] Resume: A를 한다.' > "$nonlog"
check_fail T17 "$nonlog" "$gbody" "$nonlog" "주제" --complete-resume
# T18 빈 stdin
check_fail T18 "$valid" /dev/null "$valid" "주제" --complete-resume
# T19 빈 topic
check_fail T19 "$valid" "$gbody" "$valid" "" --complete-resume
# T20 fenced 안에만 Resume 존재
onlyfenced="$WORK/onlyfenced.md"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '```markdown' '- [ ] Resume: 코드 예시.' '```' > "$onlyfenced"
check_fail T20 "$onlyfenced" "$gbody" "$onlyfenced" "주제" --complete-resume

# T22 빈 새 action(supplied Resume 비어있음)
check_fail T22 "$valid" "$gbody" "$valid" "주제" --complete-resume --resume ""
# T23 공백만 새 action
check_fail T23 "$valid" "$gbody" "$valid" "주제" --complete-resume --resume "   "
# T24 공백만 topic
check_fail T24 "$valid" "$gbody" "$valid" "   " --complete-resume
# T25 공백만 replace reason
check_fail T25 "$valid" "$gbody" "$valid" "주제" --replace-resume "   " --resume "B"
# T28 종료 구분자(---) 없는 frontmatter
noclose="$WORK/noclose.md"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' \
    '## 2026-06-12 · 초기' '' '- [ ] Resume: X를 한다.' > "$noclose"
check_fail T28 "$noclose" "$gbody" "$noclose" "주제" --complete-resume
# T29 필수 필드(status) 누락
nostatus="$WORK/nostatus.md"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] Resume: X를 한다.' > "$nostatus"
check_fail T29 "$nostatus" "$gbody" "$nostatus" "주제" --complete-resume

# ---------- 리터럴 보존(backslash) 성공 케이스 ----------

# T26 replace reason에 리터럴 백슬래시(A\nB) — 실제 개행이 아니라 그대로 보존
fx="$WORK/t26.md"; exp="$WORK/t26.exp"; body="$WORK/t26.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: X를 한다.' > "$fx"
printf '%s\n' '@codex' '' '- 처리했다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- Cancelled Resume: X를 한다. — A\nB' '' \
    '## 2026-06-12 · 백슬래시' '' '@codex' '' '- 처리했다.' '' \
    '- [ ] Resume: Y를 한다' > "$exp"
check_build T26 "$fx" "$exp" "백슬래시" replace 'A\nB' 1 'Y를 한다' "$body"
check_append_ok T26 "$fx" "$exp" "$body" "$fx" "백슬래시" --replace-resume 'A\nB' --resume 'Y를 한다'

# T27 replace reason에 Windows식 경로(역슬래시 다수) — 리터럴 보존
fx="$WORK/t27.md"; exp="$WORK/t27.exp"; body="$WORK/t27.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: X를 한다.' > "$fx"
printf '%s\n' '@codex' '' '- 처리했다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- Cancelled Resume: X를 한다. — C:\Users\me\doc.txt' '' \
    '## 2026-06-12 · 경로' '' '@codex' '' '- 처리했다.' '' \
    '- [ ] Resume: Y를 한다' > "$exp"
check_build T27 "$fx" "$exp" "경로" replace 'C:\Users\me\doc.txt' 1 'Y를 한다' "$body"
check_append_ok T27 "$fx" "$exp" "$body" "$fx" "경로" --replace-resume 'C:\Users\me\doc.txt' --resume 'Y를 한다'

# ---------- --cancel-resume 성공 케이스 ----------

# T30 일반 reason cancel(새 Resume 없음)
fx="$WORK/t30.md"; exp="$WORK/t30.exp"; body="$WORK/t30.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: X를 한다.' > "$fx"
printf '%s\n' '@codex' '' '- 더 필요 없어 폐기한다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- Cancelled Resume: X를 한다. — 더 이상 필요 없어 폐기' '' \
    '## 2026-06-12 · 취소' '' '@codex' '' '- 더 필요 없어 폐기한다.' > "$exp"
check_build T30 "$fx" "$exp" "취소" cancel "더 이상 필요 없어 폐기" 0 "" "$body"
check_append_ok T30 "$fx" "$exp" "$body" "$fx" "취소" --cancel-resume "더 이상 필요 없어 폐기"

# T31 cancel이 multiline 연속·들여쓰기 보존
fx="$WORK/t31.md"; exp="$WORK/t31.exp"; body="$WORK/t31.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '  - [ ] Resume: 첫 행동.' '    설명 줄.' > "$fx"
printf '%s\n' '@codex' '' '- 연기한다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '  - Cancelled Resume: 첫 행동. — 연기' '    설명 줄.' '' \
    '## 2026-06-12 · 연기' '' '@codex' '' '- 연기한다.' > "$exp"
check_build T31 "$fx" "$exp" "연기" cancel "연기" 0 "" "$body"
check_append_ok T31 "$fx" "$exp" "$body" "$fx" "연기" --cancel-resume "연기"

# T32 cancel reason에 리터럴 백슬래시 보존
fx="$WORK/t32.md"; exp="$WORK/t32.exp"; body="$WORK/t32.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: X를 한다.' > "$fx"
printf '%s\n' '@codex' '' '- 경로 사유로 취소.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- Cancelled Resume: X를 한다. — C:\tmp\x' '' \
    '## 2026-06-12 · 경로취소' '' '@codex' '' '- 경로 사유로 취소.' > "$exp"
check_build T32 "$fx" "$exp" "경로취소" cancel 'C:\tmp\x' 0 "" "$body"
check_append_ok T32 "$fx" "$exp" "$body" "$fx" "경로취소" --cancel-resume 'C:\tmp\x'

# ---------- --cancel-resume 실패 케이스(원본 무변경) ----------

# T33 cancel + Resume 금지
check_fail T33 "$valid" "$gbody" "$valid" "주제" --cancel-resume "이유" --resume "B"
# T34 cancel + complete 배타
check_fail T34 "$valid" "$gbody" "$valid" "주제" --cancel-resume "이유" --complete-resume
# T35 cancel + replace 배타
check_fail T35 "$valid" "$gbody" "$valid" "주제" --cancel-resume "이유" --replace-resume "이유2"
# T36 빈 cancel reason
check_fail T36 "$valid" "$gbody" "$valid" "주제" --cancel-resume ""
# T37 공백만 cancel reason
check_fail T37 "$valid" "$gbody" "$valid" "주제" --cancel-resume "   "
# T38 여러 줄 cancel reason
nl=$(printf 'a\nb')
check_fail T38 "$valid" "$gbody" "$valid" "주제" --cancel-resume "$nl"
# T39 cancel인데 실제 Resume 타깃 없음
check_fail T39 "$notarget" "$gbody" "$notarget" "주제" --cancel-resume "이유"

# ---------- 실제 append 성공 케이스(네 mode + 권한 보존) ----------

# A1 body-only apply, 기존 Resume 유지
fx="$WORK/a1.md"; exp="$WORK/a1.exp"; body="$WORK/a1.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: A와 B를 구현한다.' > "$fx"
printf '%s\n' '@codex' '' '- 관련 자료를 확인했다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: A와 B를 구현한다.' '' \
    '## 2026-06-12 · 조사' '' '@codex' '' '- 관련 자료를 확인했다.' > "$exp"
check_append_ok A1 "$fx" "$exp" "$body" "$fx" "조사"

# A2 complete apply + 원본 권한 보존(640)
fx="$WORK/a2.md"; exp="$WORK/a2.exp"; body="$WORK/a2.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- 무언가 했다.' '' \
    '- [ ] Resume: A와 B를 구현한다.' > "$fx"
chmod 640 "$fx"
printf '%s\n' '@codex' '' '- 통합 작업을 마쳤다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- 무언가 했다.' '' \
    '- [x] Resume: A와 B를 구현한다.' '' \
    '## 2026-06-12 · 새 블록 주제' '' '@codex' '' '- 통합 작업을 마쳤다.' '' \
    '- [ ] Resume: 통합 테스트를 실행한다' > "$exp"
check_append_ok A2 "$fx" "$exp" "$body" "$fx" "새 블록 주제" --complete-resume --resume "통합 테스트를 실행한다"
m=$(mode_of "$fx")
if [ -z "$m" ] || [ "$m" = "640" ]; then ok "A2 권한 보존(640)"; else ng "A2 권한 불일치($m)"; fi

# A3 replace apply(부분 완료 대체)
fx="$WORK/a3.md"; exp="$WORK/a3.exp"; body="$WORK/a3.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: A와 B를 구현한다.' > "$fx"
printf '%s\n' '@codex' '' '- A는 완료했다. 남은 B와 C는 새 행동으로 옮긴다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' \
    '- Cancelled Resume: A와 B를 구현한다. — A는 완료했고 남은 범위를 아래 행동으로 대체' '' \
    '## 2026-06-12 · 부분 완료' '' '@codex' '' \
    '- A는 완료했다. 남은 B와 C는 새 행동으로 옮긴다.' '' \
    '- [ ] Resume: B와 C를 구현한다' > "$exp"
check_append_ok A3 "$fx" "$exp" "$body" "$fx" "부분 완료" --replace-resume "A는 완료했고 남은 범위를 아래 행동으로 대체" --resume "B와 C를 구현한다"

# A4 cancel apply(새 Resume 없음)
fx="$WORK/a4.md"; exp="$WORK/a4.exp"; body="$WORK/a4.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: X를 한다.' > "$fx"
printf '%s\n' '@codex' '' '- 더 필요 없어 폐기한다.' > "$body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- Cancelled Resume: X를 한다. — 더 이상 필요 없어 폐기' '' \
    '## 2026-06-12 · 취소' '' '@codex' '' '- 더 필요 없어 폐기한다.' > "$exp"
check_append_ok A4 "$fx" "$exp" "$body" "$fx" "취소" --cancel-resume "더 이상 필요 없어 폐기"

# A5 Resume 0개에서 최초 --resume bootstrap
fx="$WORK/a5.md"; body="$WORK/a5.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] Work item A' '- [ ] Work item B' > "$fx"
printf '%s\n' '@codex' '' '- 작업 범위를 정했다.' > "$body"
if "$LOG" append "$fx" "bootstrap" --resume "Work item A부터 시작한다" < "$body" > /dev/null 2>&1 &&
   [ "$(find_resumes "$fx" | awk 'END { print NR + 0 }')" -eq 1 ]; then
    ok "A5 최초 Resume bootstrap"
else
    ng "A5 최초 Resume bootstrap 실패"
fi

# A6 본문의 실제 Resume은 거부하고 fenced 예시는 허용
body="$WORK/a6.body"
printf '%s\n' '- [ ] Resume: 본문 직접 작성' > "$body"
check_fail A6-direct "$fx" "$body" "$fx" "직접 작성"
printf '%s\n' '```markdown' '- [ ] Resume: 코드 예시' '```' > "$body"
if "$LOG" append "$fx" "fenced 예시" < "$body" > /dev/null 2>&1; then
    ok "A6 fenced Resume 예시 허용"
else
    ng "A6 fenced Resume 예시 거부됨"
fi

# A11 미완료 Resume이 여러 개면 모든 append 거부
fx="$WORK/a11.md"; body="$WORK/a11.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] Resume: one' '- [ ] Resume: two' > "$fx"
printf '%s\n' '- append하면 안 된다.' > "$body"
check_fail A11 "$fx" "$body" "$fx" "다중 Resume"
if "$LOG" audit --resume "$fx" > /dev/null 2>&1; then
    ng "A11 audit --resume이 다중 Resume을 허용"
else
    ok "A11 audit --resume 다중 Resume 탐지"
fi

# A12 legacy `다음:`은 Resume Pointer로 인식하지 않음
fx="$WORK/a12.md"; body="$WORK/a12.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '- [ ] 다음: legacy 행동' > "$fx"
printf '%s\n' '- 전이하면 안 된다.' > "$body"
cp "$fx" "$WORK/a12.before"
audit_output=$("$LOG" audit --resume "$fx" 2>&1)
if printf '%s\n' "$audit_output" | grep -q 'Resume Pointer 없음'; then
    ok "A12 legacy 다음 audit 미인식"
else
    ng "A12 legacy 다음을 Resume으로 인식"
fi
if "$LOG" append "$fx" "legacy 전이" --complete-resume < "$body" > /dev/null 2>&1; then
    ng "A12 legacy 다음에 Resume 전이 성공"
elif cmp -s "$fx" "$WORK/a12.before"; then
    ok "A12 legacy 다음 전이 거부/원본 무변경"
else
    ng "A12 legacy 다음 전이 실패 후 원본 변경"
fi

# ---------- append 실패/경계 케이스(원본 무변경) ----------

# A7 동시 수정 감지(직접 호출): apply_result가 받은 snapshot이 현재 원본과 다르면 결과
# 생성 중 원본이 바뀐 상황이므로 교체를 거부하고 원본을 보존한다. 운영 코드에 범용 실패
# hook을 넣지 않고, apply_result의 정상 인자인 snapshot을 불일치로 주어 동시 수정 상태를
# 좁게 재현한다.
afx="$WORK/a7.md"; aout="$WORK/a7.out"; asnap="$WORK/a7.snap"
printf '%s\n' '현재 원본' > "$afx"
printf '%s\n' '교체 후보 결과' > "$aout"
printf '%s\n' '빌드 시작 시점 스냅샷(다름)' > "$asnap"
cp "$afx" "$WORK/a7.before"
if apply_result "$afx" "$aout" "$asnap" > /dev/null 2>&1; then
    ng "A7 동시 수정인데 적용 성공"
elif cmp -s "$afx" "$WORK/a7.before"; then
    ok "A7 동시 수정 감지/원본 무변경"
else
    ng "A7 원본 변경됨"
fi

# A8 교체 실패(직접 호출): snapshot이 원본과 같아 검증은 통과하지만 out이 없으면 mv가
# 실패한다. 존재하지 않는 out으로 mv 실패를 root와 무관하게 결정적으로 유도해(권한 트릭
# 없이) 교체 실패 시 원본 무변경을 검증한다.
afx="$WORK/a8.md"; asnap="$WORK/a8.snap"; aout="$WORK/a8.missing"
printf '%s\n' '원본 A8' > "$afx"
cp "$afx" "$asnap"
rm -f "$aout"
cp "$afx" "$WORK/a8.before"
if apply_result "$afx" "$aout" "$asnap" > /dev/null 2>&1; then
    ng "A8 교체 실패인데 성공"
elif cmp -s "$afx" "$WORK/a8.before"; then
    ok "A8 교체 실패/원본 무변경"
else
    ng "A8 원본 변경됨"
fi

# A9 결과 쓰기 실패: build_result 출력을 일반 파일 하위 경로로 보내 ENOTDIR로 쓰기를
# 실패시킨다(권한이 아닌 경로 형태라 root에서도 결정적). build_result는 원본을 읽기만
# 하므로 원본은 바뀌지 않고 비0으로 끝난다. apply 경로의 `if ! build_result` 가드가 이
# 경우 교체로 진행하지 않음을 같은 불변식으로 보장한다.
afx="$WORK/a9.md"; abody="$WORK/a9.body"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: X를 한다.' > "$afx"
printf '%s\n' '@codex' '' '- 본문.' > "$abody"
printf '%s' 'not a directory' > "$WORK/a9notdir"
cp "$afx" "$WORK/a9.before"
# 2>/dev/null을 먼저 적용해 fd1 redirect의 ENOTDIR 진단까지 억제한다(순서 의존).
if build_result "$afx" "주제" complete "" 0 "" "$abody" 2>/dev/null > "$WORK/a9notdir/child"; then
    ng "A9 쓰기 실패인데 성공"
elif cmp -s "$afx" "$WORK/a9.before"; then
    ok "A9 쓰기 실패/원본 무변경"
else
    ng "A9 원본 변경됨"
fi

# A10 append 결과 임시 파일 생성 실패: PATH의 좁은 mktemp 대역이 대상 디렉터리용
# `.log-append.XXXXXX` 호출만 실패시키고 일반 임시 파일 생성은 실제 mktemp에 위임한다.
# 이전의 예측 가능한 fallback 경로와 같은 이름에 symlink를 미리 두고, 실제 cmd_append
# 경로가 fail-closed로 끝나 대상·symlink 대상 모두를 건드리지 않는지 확인한다.
afx="$WORK/a10.md"; abody="$WORK/a10.body"; sentinel="$WORK/a10.sentinel"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '@codex' '' '- [ ] Resume: X를 한다.' > "$afx"
printf '%s\n' '@codex' '' '- 본문.' > "$abody"
printf '%s\n' '충돌 파일 보존' > "$sentinel"
collision="$(dirname "$afx")/.log-append-out.$$"
ln -s "$sentinel" "$collision"
cp "$afx" "$WORK/a10.before"
cp "$sentinel" "$WORK/a10.sentinel.before"
real_mktemp=$(command -v mktemp)
mkdir "$WORK/a10-bin"
cat > "$WORK/a10-bin/mktemp" <<EOF
#!/bin/sh
case "\${1-}" in
    */.log-append.XXXXXX) exit 1 ;;
    *) exec "$real_mktemp" "\$@" ;;
esac
EOF
chmod +x "$WORK/a10-bin/mktemp"
if PATH="$WORK/a10-bin:$PATH" cmd_append "$afx" "주제" --complete-resume < "$abody" > /dev/null 2>&1; then
    ng "A10 임시 파일 생성 실패인데 적용 성공"
elif ! cmp -s "$afx" "$WORK/a10.before"; then
    ng "A10 원본 변경됨"
elif [ ! -L "$collision" ] || ! cmp -s "$sentinel" "$WORK/a10.sentinel.before"; then
    ng "A10 충돌 symlink 또는 대상 변경됨"
else
    ok "A10 임시 파일 생성 실패/충돌 경로 무변경"
fi

# ---------- 번호형 Work Item audit/close 가드 ----------

# W1 번호형 미완료 Work Item(`1. [ ]`)을 audit이 검출한다.
wfx="$WORK/w1.md"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '## Work Items' '' '1. [ ] 첫 항목.' '2. [x] 둘째 항목.' > "$wfx"
if "$LOG" audit "$wfx" 2>/dev/null | grep -q '1\. \[ \] 첫 항목'; then
    ok "W1 번호형 미완료 Work Item audit 검출"
else
    ng "W1 번호형 미완료 Work Item audit 미검출"
fi

# W2 번호형 미완료가 있으면 decided 전환을 거부하고 status는 open 유지.
if "$LOG" set-status "$wfx" decided > /dev/null 2>&1; then
    ng "W2 번호형 미완료인데 decided 성공"
elif [ "$(read_field "$wfx" status)" != "open" ]; then
    ng "W2 거부됐는데 status가 open이 아님"
else
    ok "W2 번호형 미완료 decided 거부/open 유지"
fi

# W3 번호형 Work Item이 모두 완료면 decided 통과(정상 동작 보존).
wfx3="$WORK/w3.md"
printf '%s\n' '---' 'topic: 테스트' 'description: 설명' 'status: open' '---' '' \
    '## 2026-06-12 · 초기' '' '## Work Items' '' '1. [x] 첫 항목.' '2. [x] 둘째 항목.' > "$wfx3"
if "$LOG" set-status "$wfx3" decided > /dev/null 2>&1 && [ "$(read_field "$wfx3" status)" = "decided" ]; then
    ok "W3 번호형 전부 완료 decided 통과"
else
    ng "W3 번호형 전부 완료인데 decided 실패"
fi

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
