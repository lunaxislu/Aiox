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

write_log() {
    file=$1 topic=$2 resume=${3-}
    {
        echo '---'
        printf 'topic: %s\n' "$topic"
        printf 'description: %s description\n' "$topic"
        echo 'status: open'
        echo '---'
        echo
        printf '## 2026-06-14 · %s latest\n' "$topic"
        echo
        echo '- context'
        if [ -n "$resume" ]; then
            printf '\n- [ ] Resume: %s\n' "$resume"
        fi
    } > "$file"
}

# T1: 활성 plan 단계 로그에서 Resume 체인을 따라 leaf 하나만 선택한다.
repo="$WORK/t1"; setup_repo "$repo"
write_log "$repo/logs/parent.md" parent 'Complete `logs/child.md`, then return.'
write_log "$repo/logs/child.md" child 'Review current files.'
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
if printf '%s\n' "$out" | grep -q '현재 작업 로그:' &&
   printf '%s\n' "$out" | grep -q 'logs/child.md  \[open\]  child' &&
   ! printf '%s\n' "$out" | grep -q '^열린 로그:'; then
    ok "T1 leaf 로그 선택"
else
    ng "T1 leaf 로그 선택"
fi

# T2: Resume 순환은 경고하고 무한 추적하지 않는다.
repo="$WORK/t2"; setup_repo "$repo"
write_log "$repo/logs/a.md" a '`logs/b.md`로 이동한다.'
write_log "$repo/logs/b.md" b '`logs/a.md`로 이동한다.'
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
if printf '%s\n' "$out" | grep -q 'Resume Pointer 순환'; then ok "T2 순환 경고"; else ng "T2 순환 경고"; fi

# T3: 활성 plan이 없고 open 로그가 여러 개면 후보를 유지한다.
repo="$WORK/t3"; setup_repo "$repo"
write_log "$repo/logs/a.md" a
write_log "$repo/logs/b.md" b
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q '현재 작업 후보:' &&
   printf '%s\n' "$out" | grep -q '자동 선택하지 않았습니다'; then
    ok "T3 복수 open 후보"
else
    ng "T3 복수 open 후보"
fi

# T4: 활성 plan이 없고 open 로그가 하나면 그 로그를 선택한다.
repo="$WORK/t4"; setup_repo "$repo"
write_log "$repo/logs/only.md" only 'Start here.'
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q 'logs/only.md  \[open\]  only'; then ok "T4 단일 open 선택"; else ng "T4 단일 open 선택"; fi

# T5: Resume 뒤쪽의 logs 문서 언급은 분리 로그 포인터로 오인하지 않는다.
repo="$WORK/t5"; setup_repo "$repo"
write_log "$repo/logs/current.md" current 'Review portable contracts and then inspect root AGENTS.md, workflow.md, and logs/AGENTS.md for duplication.'
cat > "$repo/logs/AGENTS.md" <<'EOF'
# Logs contract
EOF
cat > "$repo/plans/work/work.md" <<'EOF'
# Work
## Objective
test
## Completion condition
- done
## Stages
- [>] active -> `logs/current.md`
EOF
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q 'logs/current.md  \[open\]  current' &&
   ! printf '%s\n' "$out" | grep -q '^경고:'; then
    ok "T5 뒤쪽 문서 경로 미추적"
else
    ng "T5 뒤쪽 문서 경로 미추적"
fi

# T6: plan이 모두 완료돼 활성 단계가 없어도 유일한 referenced leaf를 선택한다.
repo="$WORK/t6"; setup_repo "$repo"
write_log "$repo/logs/parent.md" parent 'Complete `logs/leaf.md`, then return.'
write_log "$repo/logs/leaf.md" leaf 'Continue leaf work.'
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
    ok "T6 완료 plan 후 referenced leaf 선택"
else
    ng "T6 완료 plan 후 referenced leaf 선택"
fi

# T7: referenced leaf가 여러 개면 자동 선택하지 않는다.
repo="$WORK/t7"; setup_repo "$repo"
write_log "$repo/logs/a.md" a 'Complete `logs/a-leaf.md`.'
write_log "$repo/logs/a-leaf.md" a-leaf
write_log "$repo/logs/b.md" b 'Complete `logs/b-leaf.md`.'
write_log "$repo/logs/b-leaf.md" b-leaf
out=$(cd "$repo" && scripts/onramp)
if printf '%s\n' "$out" | grep -q '현재 작업 후보:' &&
   printf '%s\n' "$out" | grep -q 'leaf가 하나로 정해지지 않아'; then
    ok "T7 복수 referenced leaf 후보"
else
    ng "T7 복수 referenced leaf 후보"
fi

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
