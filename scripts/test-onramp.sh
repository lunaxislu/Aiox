#!/bin/sh
set -eu

ROOT=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
ONRAMP="$ROOT/scripts/onramp"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT HUP INT TERM

pass=0
fail=0
ok() { echo "ok   $1"; pass=$((pass + 1)); }
ng() { echo "not ok $1"; fail=$((fail + 1)); }

setup_repo() {
    repo=$1
    mkdir -p "$repo/scripts" "$repo/.agents/skills/log/scripts" "$repo/plans/work" "$repo/logs"
    cp "$ONRAMP" "$repo/scripts/onramp"
    cp "$ROOT/.agents/skills/log/scripts/log" "$repo/.agents/skills/log/scripts/log"
    chmod +x "$repo/scripts/onramp" "$repo/.agents/skills/log/scripts/log"
    git -C "$repo" init -q
}

# 잘 형성된 open 로그. resume(선택)가 있으면 local [>] W1을 둔다. return_src(선택)가 있으면
# 분리 작업 로그처럼 그 source를 가리키는 Return Target을, 없으면 독립 로그를 명시한다.
write_log() {
    file=$1 topic=$2 resume=${3-} return_src=${4-}
    {
        echo '---'
        printf 'topic: %s\n' "$topic"
        printf 'description: %s description\n' "$topic"
        echo 'status: open'
        echo '---'
        echo
        echo '## Work Items'
        echo
        [ -n "$resume" ] && printf -- '- [>] W1 %s\n' "$resume"
        echo
        echo '## Required Context'
        echo
        echo '### Return Target'
        echo
        if [ -n "$return_src" ]; then
            printf -- '- Log: `%s`\n' "$return_src"
            echo '- Work Item: W1'
            echo '- Consume when: source가 이 로그 결과를 소비한다.'
            echo '- Context snapshot: source 판단 기준.'
        else
            echo '- None: independent log.'
        fi
        echo
        printf '## 2026-06-14 · %s latest\n' "$topic"
        echo
        echo '- context'
    } > "$file"
}

# local [>] 없이 하나 이상의 child 로그로 detach하는 source/anchor 로그.
# topic 뒤 인자는 repo 기준 target 경로들이다.
write_detach_log() {
    file=$1 topic=$2
    shift 2
    {
        echo '---'
        printf 'topic: %s\n' "$topic"
        printf 'description: %s description\n' "$topic"
        echo 'status: open'
        echo '---'
        echo
        echo '## Work Items'
        echo
        i=1
        for target in "$@"; do
            printf -- '- [↓] W%d Resume after child. — detached: %s — reason: needs %s result\n' "$i" "$target" "$target"
            i=$((i + 1))
        done
        echo
        echo '## Required Context'
        echo
        echo '### Return Target'
        echo
        echo '- None: independent log.'
        echo
        printf '## 2026-06-14 · %s latest\n' "$topic"
        echo
        echo '- context'
    } > "$file"
}

# T1: anchor에 local [>]가 없고 unresolved [↓]가 하나면 그 분리 작업 로그를 따라간다.
repo="$WORK/t1"; setup_repo "$repo"
write_detach_log "$repo/logs/parent.md" parent logs/child.md
write_log "$repo/logs/child.md" child 'Review current files.' logs/parent.md
cat > "$repo/plans/work/work.md" <<'EOF'
# Work
## Objective
test
## Completion condition
- done
## Stages
- [>] active -> `logs/parent.md`
EOF
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q 'logs/child.md  \[open\]  child' &&
   ! printf '%s\n' "$out" | grep -q '^경고:'; then
    ok "T1 단일 [↓] follow"
else
    ng "T1 단일 [↓] follow"; printf '%s\n' "$out"
fi

# T2: [↓] 순환은 경고하고 무한 추적하지 않는다.
repo="$WORK/t2"; setup_repo "$repo"
write_detach_log "$repo/logs/a.md" a logs/b.md
write_detach_log "$repo/logs/b.md" b logs/a.md
cat > "$repo/plans/work/work.md" <<'EOF'
# Work
## Objective
test
## Completion condition
- done
## Stages
- [>] active -> `logs/a.md`
EOF
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q '순환'; then ok "T2 [↓] 순환 경고"; else ng "T2 [↓] 순환 경고"; printf '%s\n' "$out"; fi

# T3: 활성 plan이 없고 open 로그가 여러 개면 후보를 유지한다.
repo="$WORK/t3"; setup_repo "$repo"
write_log "$repo/logs/a.md" a 'A work.'
write_log "$repo/logs/b.md" b 'B work.'
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q '현재 작업 후보:' &&
   printf '%s\n' "$out" | grep -q '자동 선택하지 않았습니다'; then
    ok "T3 복수 open 후보"
else
    ng "T3 복수 open 후보"; printf '%s\n' "$out"
fi

# T4: 활성 plan이 없고 open 로그가 하나면 그 로그를 선택한다.
repo="$WORK/t4"; setup_repo "$repo"
write_log "$repo/logs/only.md" only 'Start here.'
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q 'logs/only.md  \[open\]  only'; then ok "T4 단일 open 선택"; else ng "T4 단일 open 선택"; printf '%s\n' "$out"; fi

# T5: local [>]가 [↓]보다 우선한다. [>]가 있으면 그 로그에서 재개하고, 같은 로그의 [↓]나
# [>] 행동 텍스트의 부수적 logs/ 언급을 따라가지 않는다.
repo="$WORK/t5"; setup_repo "$repo"
{
    echo '---'; echo 'topic: parent'; echo 'description: parent description'
    echo 'status: open'; echo '---'; echo
    echo '## Work Items'; echo
    echo '- [>] W1 Local resume; see logs/child.md and logs/AGENTS.md for context.'
    echo '- [↓] W2 Resume after child. — detached: logs/child.md — reason: needs child result'
    echo
    echo '## Required Context'; echo
    echo '### Return Target'; echo
    echo '- None: independent log.'; echo
    echo '## 2026-06-14 · parent latest'; echo; echo '- context'
} > "$repo/logs/parent.md"
write_log "$repo/logs/child.md" child 'Should not be selected.' logs/parent.md
cat > "$repo/plans/work/work.md" <<'EOF'
# Work
## Objective
test
## Completion condition
- done
## Stages
- [>] active -> `logs/parent.md`
EOF
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q 'logs/parent.md  \[open\]  parent' &&
   ! printf '%s\n' "$out" | grep -q 'logs/child.md  \[open\]  child' &&
   ! printf '%s\n' "$out" | grep -q '^경고:'; then
    ok "T5 [>] 우선(부수 언급 미추적)"
else
    ng "T5 [>] 우선(부수 언급 미추적)"; printf '%s\n' "$out"
fi

# T6: plan이 모두 완료돼 활성 단계가 없어도 [↓] 참조 그래프의 유일한 leaf를 선택한다.
repo="$WORK/t6"; setup_repo "$repo"
write_detach_log "$repo/logs/parent.md" parent logs/leaf.md
write_log "$repo/logs/leaf.md" leaf 'Continue leaf work.' logs/parent.md
write_log "$repo/logs/unrelated.md" unrelated 'Independent work.'
cat > "$repo/plans/work/work.md" <<'EOF'
# Work
## Objective
test
## Completion condition
- done
## Stages
- [x] completed -> `logs/parent.md`
EOF
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q '유일한 leaf' &&
   printf '%s\n' "$out" | grep -q 'logs/leaf.md  \[open\]  leaf'; then
    ok "T6 완료 plan 후 [↓] 참조 leaf 선택"
else
    ng "T6 완료 plan 후 [↓] 참조 leaf 선택"; printf '%s\n' "$out"
fi

# T7: [↓] 참조 leaf가 여러 개면 자동 선택하지 않는다.
repo="$WORK/t7"; setup_repo "$repo"
write_detach_log "$repo/logs/a.md" a logs/a-leaf.md
write_log "$repo/logs/a-leaf.md" a-leaf '' logs/a.md
write_detach_log "$repo/logs/b.md" b logs/b-leaf.md
write_log "$repo/logs/b-leaf.md" b-leaf '' logs/b.md
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q '현재 작업 후보:' &&
   printf '%s\n' "$out" | grep -q 'leaf가 하나로 정해지지 않아'; then
    ok "T7 복수 [↓] 참조 leaf 후보"
else
    ng "T7 복수 [↓] 참조 leaf 후보"; printf '%s\n' "$out"
fi

# T8: 코드블록 안 fenced [↓] 예시를 진짜 분리 pointer로 오인하지 않고 진짜만 따라간다.
repo="$WORK/t8"; setup_repo "$repo"
{
    echo '---'; echo 'topic: parent'; echo 'description: parent description'
    echo 'status: open'; echo '---'; echo
    echo '## Work Items'; echo
    echo '```markdown'
    echo '- [↓] W1 Example. — detached: logs/wrong.md — reason: should be ignored'
    echo '```'
    echo '- [↓] W2 Resume after child. — detached: logs/realchild.md — reason: needs real result'
    echo
    echo '## Required Context'; echo
    echo '### Return Target'; echo
    echo '- None: independent log.'; echo
    echo '## 2026-06-14 · parent latest'; echo; echo '- context'
} > "$repo/logs/parent.md"
write_log "$repo/logs/realchild.md" realchild 'Continue real work.' logs/parent.md
write_log "$repo/logs/wrong.md" wrong 'Should not be selected.' logs/parent.md
cat > "$repo/plans/work/work.md" <<'EOF'
# Work
## Objective
test
## Completion condition
- done
## Stages
- [>] active -> `logs/parent.md`
EOF
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q 'logs/realchild.md  \[open\]  realchild' &&
   ! printf '%s\n' "$out" | grep -q 'logs/wrong.md  \[open\]  wrong'; then
    ok "T8 fenced [↓] 예시 미추적/진짜 따라감"
else
    ng "T8 fenced [↓] 예시 미추적/진짜 따라감"; printf '%s\n' "$out"
fi

# T9: ## Work Items 같은 비-날짜 섹션 제목을 latest로 오인하지 않고 최신 날짜 블록을 잡는다.
repo="$WORK/t9"; setup_repo "$repo"
{
    echo '---'; echo 'topic: wi'; echo 'description: wi description'
    echo 'status: open'; echo '---'; echo
    echo '## 2026-06-14 · 실제 최신 작업'; echo
    echo '- 작업 내용'; echo
    echo '## Work Items'; echo '- [>] W1 시작점'
} > "$repo/logs/only.md"
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q 'latest: 2026-06-14 · 실제 최신 작업' &&
   ! printf '%s\n' "$out" | grep -q 'latest: Work Items'; then
    ok "T9 latest가 날짜 블록(Work Items 오인 안 함)"
else
    ng "T9 latest가 날짜 블록(Work Items 오인 안 함)"; printf '%s\n' "$out"
fi

# T10: fenced 예시 안의 날짜 heading을 latest로 오인하지 않고 실제 최신 블록을 잡는다.
repo="$WORK/t10"; setup_repo "$repo"
{
    echo '---'; echo 'topic: fenced'; echo 'description: fenced description'
    echo 'status: open'; echo '---'; echo
    echo '## Work Items'; echo '- [>] W1 시작점'; echo
    echo '## 2026-06-14 · 실제 최신 작업'; echo
    echo '- 작업 내용'; echo
    echo '```markdown'
    echo '## 2026-12-31 · fenced 예시'
    echo '```'
} > "$repo/logs/only.md"
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q 'latest: 2026-06-14 · 실제 최신 작업' &&
   ! printf '%s\n' "$out" | grep -q 'latest: 2026-12-31'; then
    ok "T10 latest가 fenced 날짜 오인 안 함"
else
    ng "T10 latest가 fenced 날짜 오인 안 함"; printf '%s\n' "$out"
fi

# T11: [↓] 분리 작업 로그 대상이 존재하지 않으면 경고하고 자동 선택하지 않는다.
repo="$WORK/t11"; setup_repo "$repo"
write_detach_log "$repo/logs/parent.md" parent logs/missing.md
cat > "$repo/plans/work/work.md" <<'EOF'
# Work
## Objective
test
## Completion condition
- done
## Stages
- [>] active -> `logs/parent.md`
EOF
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q '분리 작업 로그 대상이 존재하지 않습니다'; then
    ok "T11 깨진 [↓] target 경고"
else
    ng "T11 깨진 [↓] target 경고"; printf '%s\n' "$out"
fi

# T12: anchor에 local [>] 없이 unresolved [↓]가 여러 개면 자동 선택하지 않고 후보를 보여준다.
repo="$WORK/t12"; setup_repo "$repo"
write_detach_log "$repo/logs/parent.md" parent logs/b.md logs/c.md
write_log "$repo/logs/b.md" b 'B work.' logs/parent.md
write_log "$repo/logs/c.md" c 'C work.' logs/parent.md
cat > "$repo/plans/work/work.md" <<'EOF'
# Work
## Objective
test
## Completion condition
- done
## Stages
- [>] active -> `logs/parent.md`
EOF
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q 'unresolved \[↓\]가 여러 개' &&
   printf '%s\n' "$out" | grep -q '^- logs/b.md$' &&
   printf '%s\n' "$out" | grep -q '^- logs/c.md$'; then
    ok "T12 복수 [↓] ambiguous 후보"
else
    ng "T12 복수 [↓] ambiguous 후보"; printf '%s\n' "$out"
fi

# T13: plan 단계 pointer는 명시적 `-> ` 마커 뒤의 경로만 anchor로 삼고, 단계 서술의 앞쪽
# logs/ 언급(예: `→ logs/decoy.md`)은 anchor로 오인하지 않는다.
repo="$WORK/t13"; setup_repo "$repo"
write_log "$repo/logs/real.md" real 'Real stage work.'
write_log "$repo/logs/decoy.md" decoy 'Decoy mention only.'
cat > "$repo/plans/work/work.md" <<'EOF'
# Work
## Objective
test
## Completion condition
- done
## Stages
- [>] disposition — 앞서 → `logs/decoy.md` row를 확정한 뒤 -> `logs/real.md`
EOF
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q 'logs/real.md  \[open\]  real' &&
   ! printf '%s\n' "$out" | grep -q 'logs/decoy.md  \[open\]  decoy'; then
    ok "T13 plan pointer는 -> 마커만 따름"
else
    ng "T13 plan pointer는 -> 마커만 따름"; printf '%s\n' "$out"
fi

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
