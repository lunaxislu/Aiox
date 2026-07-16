#!/bin/sh
# package-log MVP command regression tests.

set -u

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
PACKAGE_LOG="$SCRIPT_DIR/package-log"

export LOG_TODAY=2026-07-08
export LOG_NOW="2026-07-08 12:34"

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

check_not_contains() {
    name=$1 file=$2 pattern=$3
    if grep -q "$pattern" "$file"; then ng "$name"; cat "$file"; else ok "$name"; fi
}

check_status() {
    name=$1 expected=$2
    shift 2
    if "$@" > "$WORK/out" 2>&1; then rc=0; else rc=$?; fi
    if [ "$rc" -eq "$expected" ]; then ok "$name"; else ng "$name rc=$rc expected=$expected"; cat "$WORK/out"; fi
}

check_status_contains() {
    name=$1 expected=$2 pattern=$3
    shift 3
    if "$@" > "$WORK/out" 2>&1; then rc=0; else rc=$?; fi
    if [ "$rc" -eq "$expected" ] && grep -q "$pattern" "$WORK/out"; then
        ok "$name"
    else
        ng "$name rc=$rc expected=$expected pattern=$pattern"
        cat "$WORK/out"
    fi
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

check_missing() {
    name=$1 path=$2
    if [ ! -e "$path" ]; then ok "$name"; else ng "$name"; ls -la "$path"; fi
}

repo_path() {
    case "$1" in
        "$WORK"/*) printf '%s\n' "${1#$WORK/}" ;;
        *) printf '%s\n' "$1" ;;
    esac
}

write_controlling_fixture() {
    file=$1
    stable_key=$2
    item_line=${3:-}
    index_rows=${4:-}
    mkdir -p "$(dirname "$file")"
    {
        echo '---'
        echo 'topic: Fixture Package'
        echo 'description: Fixture package desc'
        echo 'status: open'
        echo '---'
        echo
        echo '## Work Items'
        echo
        if [ -n "$item_line" ]; then
            printf '%s\n' "$item_line"
        fi
        echo
        echo '## Required Context'
        echo
        echo '### Return Target'
        echo
        echo '- None: independent log.'
        echo
        echo '## Package Scope'
        echo
        echo '- Primary: docs/primary.md'
        echo
        echo '## Workflow / Agent Plan'
        echo
        echo '- N/A: fixture.'
        echo
        echo '## Task Index'
        echo
        printf -- '- Stable package key: %s\n' "$stable_key"
        echo
        echo '| W-id | Profile | Mode | Task record |'
        echo '| ---- | ------- | ---- | ----------- |'
        if [ -n "$index_rows" ]; then
            printf '%s\n' "$index_rows"
        fi
        echo
        echo '## Evidence'
        echo
        echo '- N/A: fixture.'
        echo
        echo '## Cross-Artifact Effects'
        echo
        echo '- N/A: fixture.'
        echo
        echo '## Decision Candidates'
        echo
        echo '- N/A: fixture.'
        echo
        echo '## Verification Contract'
        echo
        echo '- Required: package-log check'
        echo
        echo '## Closeout Contract'
        echo
        echo '- Registry Integrity passes.'
        echo
        echo '## 2026-07-08 · Start'
    } > "$file"
}

write_source_fixture() {
    file=$1
    mkdir -p "$(dirname "$file")"
    {
        echo '---'
        echo 'topic: Source Fixture'
        echo 'description: Source fixture desc'
        echo 'status: open'
        echo '---'
        echo
        echo '## Work Items'
        echo
        echo '- [>] W1 Source package activation'
        echo
        echo '## Required Context'
        echo
        echo '### Return Target'
        echo
        echo '- None: independent log.'
        echo
        echo '### {Global}'
        echo
        echo '- Source fixture context.'
        echo
        echo '## 2026-07-08 · Start'
        echo
        echo '- Source fixture history.'
    } > "$file"
}

write_compact_record() {
    file=$1
    controlling=$2
    wid=$3
    profile=$4
    mode=$5
    quoted=${6:-plain}
    control_value=$(repo_path "$controlling")
    wid_value=$wid
    profile_value=$profile
    mode_value=$mode
    if [ "$quoted" = "quoted" ]; then
        control_value='`'"$control_value"'`'
        wid_value='`'"$wid_value"'`'
        profile_value='`'"$profile_value"'`'
        mode_value='`'"$mode_value"'`'
    fi
    mkdir -p "$(dirname "$file")"
    {
        printf '# Task Record — Fixture %s\n' "$wid"
        echo
        echo '## Identity'
        echo
        printf -- '- Controlling log: %s\n' "$control_value"
        printf -- '- Package W-id: %s\n' "$wid_value"
        printf -- '- Profile: %s\n' "$profile_value"
        printf -- '- Execution mode: %s\n' "$mode_value"
        echo
        echo '## Task Brief'
        echo
        echo '- Revision: 1'
        echo '- Objective: Fixture task'
        echo
        echo '## Task History'
        echo
        echo '- Created for test.'
        echo
        echo '## Result / Verification'
        echo
        echo '- W-id · Brief revision · Attempt: not run'
    } > "$file"
}

write_full_record() {
    file=$1
    controlling=$2
    wid=$3
    mode=$4
    quoted=${5:-plain}
    control_value=$(repo_path "$controlling")
    wid_value=$wid
    profile_value=Full
    mode_value=$mode
    if [ "$quoted" = "quoted" ]; then
        control_value='`'"$control_value"'`'
        wid_value='`'"$wid_value"'`'
        profile_value='`'"$profile_value"'`'
        mode_value='`'"$mode_value"'`'
    fi
    mkdir -p "$(dirname "$file")"
    {
        echo '---'
        echo 'topic: Full Fixture'
        echo 'description: Full fixture desc'
        echo 'status: open'
        echo '---'
        echo
        echo '## Work Items'
        echo
        echo '- [>] W1 Full child task'
        echo
        echo '## Required Context'
        echo
        echo '### Return Target'
        echo
        printf -- '- Log: `%s`\n' "$(repo_path "$controlling")"
        printf -- '- Work Item: %s\n' "$wid"
        echo '- Consume when: result reviewed'
        echo '- Context snapshot: package full child'
        echo
        echo '## Identity'
        echo
        printf -- '- Controlling log: %s\n' "$control_value"
        printf -- '- Package W-id: %s\n' "$wid_value"
        printf -- '- Profile: %s\n' "$profile_value"
        printf -- '- Execution mode: %s\n' "$mode_value"
        echo
        echo '## Task Brief'
        echo
        echo '- Revision: 1'
        echo
        echo '## 2026-07-08 · Start'
    } > "$file"
}

LOG_DIR="$WORK/logs"; export LOG_DIR
cd "$WORK" || exit 1

check_status "P0 help succeeds" 0 "$PACKAGE_LOG" --help
check_contains "P0 help output" "$WORK/out" '^사용법:'

check_status "P1 controlling scope required" 1 "$PACKAGE_LOG" controlling new --topic "No Scope" --description "Desc" --block "Start"
check_missing "P1 no-scope creates no log" "$WORK/logs/2026-07-08-no-scope.md"

check_status "P2 controlling new succeeds" 0 "$PACKAGE_LOG" controlling new --topic "Package Test" --description "Package desc" --scope "docs/primary.md" --related "docs/related.md" --block "Bootstrap"
pkg_path=$(cat "$WORK/out")
check_contains "P2 path auto generation" "$WORK/out" '/logs/2026-07-08-Package-Test\.md$'
check_contains "P2 base Work Items" "$pkg_path" '^## Work Items$'
check_contains "P2 base Required Context" "$pkg_path" '^## Required Context$'
check_contains "P2 Return Target" "$pkg_path" '^- None: independent .*log\.$'
check_contains "P2 Package Scope" "$pkg_path" '^## Package Scope$'
check_contains "P2 Workflow surface" "$pkg_path" '^## Workflow / Agent Plan$'
check_contains "P2 Task Index" "$pkg_path" '^## Task Index$'
check_contains "P2 Task Index header" "$pkg_path" '^| W-id | Profile | Mode | Task record |$'
check_contains "P2 Evidence" "$pkg_path" '^## Evidence$'
check_contains "P2 Effects" "$pkg_path" '^## Cross-Artifact Effects$'
check_contains "P2 Decisions" "$pkg_path" '^## Decision Candidates$'
check_contains "P2 Verification" "$pkg_path" '^## Verification Contract$'
check_contains "P2 Closeout" "$pkg_path" '^## Closeout Contract$'
check_contains "P2 Closeout package-specific TBD" "$pkg_path" 'package-specific closeout criteria'
check_contains "P2 primary scope" "$pkg_path" 'docs/primary\.md'
check_contains "P2 related scope" "$pkg_path" 'docs/related\.md'
check_contains "P2 stable key default" "$pkg_path" 'Stable package key: 2026-07-08-Package-Test'
check_contains "P2 package contract uses agent-neutral locator" "$pkg_path" '^- Package contract: `log skill/references/package-log\.md`\.$'
check_contains "P2 Base loop contract uses agent-neutral locator" "$pkg_path" '^- Base loop contract: `log skill/references/loop-rules\.md`\.$'
check_not_contains "P2 contracts omit local install path" "$pkg_path" '\.agents/skills/log/'
check_not_contains "P2 no repo integration default" "$pkg_path" 'logs/AGENTS.md#Package Log Repository Integration'
check_not_contains "P2 no project integration default" "$pkg_path" '^- Project integration:'

check_status "P3 controlling custom stable key" 0 "$PACKAGE_LOG" controlling new --topic "Custom Key" --description "Package desc" --scope "docs/primary.md" --stable-key "custom-key" --block "Bootstrap" --integration "project-integration.md#package-log"
custom_pkg=$(cat "$WORK/out")
check_contains "P3 stable key explicit" "$custom_pkg" 'Stable package key: custom-key'
check_contains "P3 project integration explicit" "$custom_pkg" '^- Project integration: `project-integration.md#package-log`\.$'
check_status "P3 duplicate topic creates suffixed path" 0 "$PACKAGE_LOG" controlling new --topic "Custom Key" --description "Again" --scope "docs/primary.md" --block "Bootstrap"
check_contains "P3 suffixed duplicate path" "$WORK/out" '/logs/2026-07-08-Custom-Key-2\.md$'
check_status "P3 env integration succeeds" 0 env PACKAGE_LOG_INTEGRATION_REF="env-integration.md#package-log" "$PACKAGE_LOG" controlling new --topic "Env Integration" --description "Package desc" --scope "docs/primary.md" --block "Bootstrap"
env_pkg=$(cat "$WORK/out")
check_contains "P3 env integration emitted" "$env_pkg" '^- Project integration: `env-integration.md#package-log`\.$'

task_record="logs/packages/2026-07-08-Package-Test/tasks/W1.md"
check_status "P4 task new succeeds" 0 "$PACKAGE_LOG" task new "$pkg_path" --id W1 --record "$task_record" --mode inline --task "Implement package helper"
check_contains "P4 task record created" "$task_record" '^## Identity$'
check_contains "P4 record controlling identity" "$task_record" "^- Controlling log: $pkg_path$"
check_contains "P4 record W identity" "$task_record" '^- Package W-id: W1$'
check_contains "P4 record compact profile" "$task_record" '^- Profile: Compact$'
check_contains "P4 record inline mode" "$task_record" '^- Execution mode: inline$'
check_contains "P4 Task Brief" "$task_record" '^## Task Brief'
check_contains "P4 Task History" "$task_record" '^## Task History'
check_contains "P4 Result Verification" "$task_record" '^## Result / Verification$'
check_contains "P4 task objective created" "$task_record" '^- Objective: Implement package helper$'
check_contains "P4 Work Item created from task" "$pkg_path" '^- \[ \] W1 Implement package helper$'
check_contains "P4 index row added" "$pkg_path" '| W1 | Compact | inline | `logs/packages/2026-07-08-Package-Test/tasks/W1.md` |'
check_status "P4 task new requires explicit record or auto-record" 1 "$PACKAGE_LOG" task new "$pkg_path" --id W2 --mode delegated --task "Missing record"
auto_task_record="logs/packages/2026-07-08-Package-Test/tasks/W2.md"
check_status "P4 task new auto-record succeeds" 0 "$PACKAGE_LOG" task new "$pkg_path" --id W2 --auto-record --mode delegated --task "Auto record"
check_contains "P4 auto-record canonical path output" "$WORK/out" '^logs/packages/2026-07-08-Package-Test/tasks/W2\.md$'
check_contains "P4 auto-record file created" "$auto_task_record" '^- Package W-id: W2$'
check_contains "P4 auto-record objective" "$auto_task_record" '^- Objective: Auto record$'
check_contains "P4 auto-record index row" "$pkg_path" '| W2 | Compact | delegated | `logs/packages/2026-07-08-Package-Test/tasks/W2.md` |'
check_fail_unchanged "P4 record and auto-record mutually exclusive" "$pkg_path" "$PACKAGE_LOG" task new "$pkg_path" --id W3 --record "logs/packages/2026-07-08-Package-Test/tasks/W3.md" --auto-record --mode inline --task "Both record modes"
check_missing "P4 record auto conflict creates no record" "$WORK/logs/packages/2026-07-08-Package-Test/tasks/W3.md"
check_fail_unchanged "P4 duplicate W-id fails" "$pkg_path" "$PACKAGE_LOG" task new "$pkg_path" --id W1 --record "logs/packages/2026-07-08-Package-Test/tasks/W1-dup.md" --mode inline --task "Duplicate"
check_missing "P4 duplicate W-id creates no record" "$WORK/logs/packages/2026-07-08-Package-Test/tasks/W1-dup.md"
check_fail_unchanged "P4 existing record fails" "$pkg_path" "$PACKAGE_LOG" task new "$pkg_path" --id W2 --record "$task_record" --mode inline --task "Existing record"
check_status "P4 bad mode fails" 1 "$PACKAGE_LOG" task new "$pkg_path" --id W3 --record "logs/packages/2026-07-08-package-test/tasks/W3.md" --mode remote --task "Bad mode"
check_fail_unchanged "P4 task pipe rejected without mutation" "$pkg_path" "$PACKAGE_LOG" task new "$pkg_path" --id W2 --record "logs/packages/2026-07-08-Package-Test/tasks/W2.md" --mode inline --task "Bad | table"
check_fail_unchanged "P4 record pipe rejected without mutation" "$pkg_path" "$PACKAGE_LOG" task new "$pkg_path" --id W2 --record "logs/packages/2026-07-08-Package-Test/tasks/W2|bad.md" --mode inline --task "Record pipe"
rollback_pkg="$WORK/logs/2026-07-08-rollback-fixture.md"
write_controlling_fixture "$rollback_pkg" "rollback-fixture" ''
mkdir -p "$WORK/logs/packages"
: > "$WORK/logs/packages/rollback-fixture"
check_fail_unchanged "P4 mkdir rollback leaves controlling unchanged" "$rollback_pkg" "$PACKAGE_LOG" task new "$(repo_path "$rollback_pkg")" --id W1 --record "logs/packages/rollback-fixture/tasks/W1.md" --mode inline --task "Rollback test"

index_pkg="$WORK/logs/2026-07-08-index-fixture.md"
index_record="$WORK/logs/packages/index-fixture/tasks/W2.md"
write_controlling_fixture "$index_pkg" "index-fixture" '- [ ] W2 Register existing'
write_compact_record "$index_record" "$index_pkg" W2 Compact delegated
check_status "P5 index add compact succeeds without task" 0 "$PACKAGE_LOG" index add "$(repo_path "$index_pkg")" --id W2 --record "$(repo_path "$index_record")" --profile compact --mode delegated
check_contains "P5 compact row added" "$index_pkg" '| W2 | Compact | delegated | `logs/packages/index-fixture/tasks/W2.md` |'
check_fail_unchanged "P5 duplicate index W-id fails" "$index_pkg" "$PACKAGE_LOG" index add "$(repo_path "$index_pkg")" --id W2 --record "$(repo_path "$index_record")" --profile compact --mode delegated
check_fail_unchanged "P5 index add rejects removed task option" "$index_pkg" "$PACKAGE_LOG" index add "$(repo_path "$index_pkg")" --id W3 --record "$(repo_path "$index_record")" --profile compact --mode delegated --task "Unknown option"
check_fail_unchanged "P5 index record pipe rejected without mutation" "$index_pkg" "$PACKAGE_LOG" index add "$(repo_path "$index_pkg")" --id W3 --record "logs/packages/index-fixture/tasks/W3|bad.md" --profile compact --mode delegated

quoted_pkg="$WORK/logs/2026-07-08-quoted-fixture.md"
quoted_record="$WORK/logs/packages/quoted-fixture/tasks/W3.md"
write_controlling_fixture "$quoted_pkg" "quoted-fixture" '- [ ] W3 Quoted identity'
write_compact_record "$quoted_record" "$quoted_pkg" W3 Compact inline quoted
check_status "P5 index add compact accepts backticked Identity values" 0 "$PACKAGE_LOG" index add "$(repo_path "$quoted_pkg")" --id W3 --record "$(repo_path "$quoted_record")" --profile compact --mode inline

mismatch_pkg="$WORK/logs/2026-07-08-mismatch-fixture.md"
mismatch_record="$WORK/logs/packages/mismatch-fixture/tasks/W3.md"
write_controlling_fixture "$mismatch_pkg" "mismatch-fixture" '- [ ] W3 Mismatch'
write_compact_record "$mismatch_record" "$mismatch_pkg" W99 Compact inline
check_fail_unchanged "P5 identity W-id mismatch fails" "$mismatch_pkg" "$PACKAGE_LOG" index add "$(repo_path "$mismatch_pkg")" --id W3 --record "$(repo_path "$mismatch_record")" --profile compact --mode inline
check_status "P5 missing record fails" 1 "$PACKAGE_LOG" index add "$(repo_path "$mismatch_pkg")" --id W3 --record "logs/packages/mismatch-fixture/tasks/missing.md" --profile compact --mode inline

full_pkg="$WORK/logs/2026-07-08-full-fixture.md"
full_record="$WORK/logs/2026-07-08-full-fixture-W4-review.md"
write_controlling_fixture "$full_pkg" "full-fixture" '- [ ] W4 Review'
write_full_record "$full_record" "$full_pkg" W4 delegated
check_status "P5 index add full succeeds" 0 "$PACKAGE_LOG" index add "$(repo_path "$full_pkg")" --id W4 --record "$(repo_path "$full_record")" --profile full --mode delegated
check_contains "P5 full row added" "$full_pkg" '| W4 | Full | delegated | `logs/2026-07-08-full-fixture-W4-review.md` |'

quoted_full_pkg="$WORK/logs/2026-07-08-quoted-full-fixture.md"
quoted_full_record="$WORK/logs/2026-07-08-quoted-full-fixture-W5-review.md"
write_controlling_fixture "$quoted_full_pkg" "quoted-full-fixture" '- [ ] W5 Review'
write_full_record "$quoted_full_record" "$quoted_full_pkg" W5 delegated quoted
check_status "P5 index add full accepts backticked Identity values" 0 "$PACKAGE_LOG" index add "$(repo_path "$quoted_full_pkg")" --id W5 --record "$(repo_path "$quoted_full_record")" --profile full --mode delegated

clean_pkg="$WORK/logs/2026-07-08-clean-fixture.md"
clean_record="$WORK/logs/packages/clean-fixture/tasks/W1.md"
clean_row='| W1 | Compact | inline | logs/packages/clean-fixture/tasks/W1.md |'
write_controlling_fixture "$clean_pkg" "clean-fixture" '- [ ] W1 Clean task' "$clean_row"
write_compact_record "$clean_record" "$clean_pkg" W1 Compact inline
check_status "P6 check clean package succeeds" 0 "$PACKAGE_LOG" check "$(repo_path "$clean_pkg")"

dangling_pkg="$WORK/logs/2026-07-08-dangling-fixture.md"
dangling_row='| W1 | Compact | inline | logs/packages/dangling-fixture/tasks/W1.md |'
write_controlling_fixture "$dangling_pkg" "dangling-fixture" '- [ ] W1 Dangling task' "$dangling_row"
check_status "P6 check dangling locator fails" 1 "$PACKAGE_LOG" check "$(repo_path "$dangling_pkg")"

orphan_pkg="$WORK/logs/2026-07-08-orphan-fixture.md"
orphan_record="$WORK/logs/packages/orphan-fixture/tasks/W1.md"
write_controlling_fixture "$orphan_pkg" "orphan-fixture" ''
write_compact_record "$orphan_record" "$orphan_pkg" W1 Compact inline
check_status "P6 check orphan compact fails" 1 "$PACKAGE_LOG" check "$(repo_path "$orphan_pkg")"

identity_pkg="$WORK/logs/2026-07-08-identity-fixture.md"
identity_record="$WORK/logs/packages/identity-fixture/tasks/W1.md"
identity_row='| W1 | Compact | inline | logs/packages/identity-fixture/tasks/W1.md |'
write_controlling_fixture "$identity_pkg" "identity-fixture" '- [ ] W1 Identity task' "$identity_row"
write_compact_record "$identity_record" "$identity_pkg" W2 Compact inline
check_status "P6 check identity mismatch fails" 1 "$PACKAGE_LOG" check "$(repo_path "$identity_pkg")"

missing_index_pkg="$WORK/logs/2026-07-08-missing-index-fixture.md"
write_controlling_fixture "$missing_index_pkg" "missing-index-fixture" '- [ ] W1 Missing index'
check_status "P6 check missing Task Index row fails" 1 "$PACKAGE_LOG" check "$(repo_path "$missing_index_pkg")"

extra_index_pkg="$WORK/logs/2026-07-08-extra-index-fixture.md"
extra_index_row='| W1 | Compact | inline | logs/packages/extra-index-fixture/tasks/W1.md |'
write_controlling_fixture "$extra_index_pkg" "extra-index-fixture" '' "$extra_index_row"
write_compact_record "$WORK/logs/packages/extra-index-fixture/tasks/W1.md" "$extra_index_pkg" W1 Compact inline
check_status "P6 check extra Task Index row fails" 1 "$PACKAGE_LOG" check "$(repo_path "$extra_index_pkg")"

renamed_pkg="$WORK/logs/2026-07-08-renamed-fixture.md"
renamed_row='| W1 | Compact | inline | logs/packages/renamed-fixture/tasks/renamed.md |'
write_controlling_fixture "$renamed_pkg" "renamed-fixture" '- [ ] W1 Renamed compact' "$renamed_row"
write_compact_record "$WORK/logs/packages/renamed-fixture/tasks/renamed.md" "$renamed_pkg" W1 Compact inline
check_status_contains "P6 check non-canonical compact filename fails" 1 'ERROR compact-path:' "$PACKAGE_LOG" check "$(repo_path "$renamed_pkg")"

full_orphan_pkg="$WORK/logs/2026-07-08-full-orphan-fixture.md"
full_orphan_row='| W4 | Full | delegated | logs/2026-07-08-full-orphan-fixture-W4-review.md |'
write_controlling_fixture "$full_orphan_pkg" "full-orphan-fixture" '- [ ] W4 Review' "$full_orphan_row"
write_full_record "$WORK/logs/2026-07-08-full-orphan-fixture-W4-review.md" "$full_orphan_pkg" W4 delegated
write_full_record "$WORK/logs/2026-07-08-full-orphan-fixture-W5-orphan.md" "$full_orphan_pkg" W5 delegated
check_status_contains "P6 check orphan full child fails" 1 'ERROR orphan-full:' "$PACKAGE_LOG" check "$(repo_path "$full_orphan_pkg")"

source_pkg="$WORK/logs/2026-07-08-source-fixture.md"
detach_target="logs/2026-07-08-detached-package.md"
write_source_fixture "$source_pkg"
check_status "P7 controlling detach succeeds" 0 "$PACKAGE_LOG" controlling detach "$(repo_path "$source_pkg")" --id W1 --target "$detach_target" --reason "package activation" --topic "Detached Package" --description "Detached package desc" --scope "docs/primary.md" --block "Bootstrap" --consume "package result consumed" --snapshot "source W1 package activation"
check_contains "P7 detach output includes target" "$WORK/out" "$detach_target"
check_contains "P7 source Work Item detached" "$source_pkg" '^- \[↓\] W1 Source package activation .*detached: logs/2026-07-08-detached-package\.md .*reason: package activation'
check_contains "P7 target Return Target log" "$WORK/$detach_target" '^- Log: `logs/2026-07-08-source-fixture.md`$'
check_contains "P7 target Return Target W-id" "$WORK/$detach_target" '^- Work Item: W1$'
check_contains "P7 target package scope" "$WORK/$detach_target" '^## Package Scope$'
check_contains "P7 target Task Index" "$WORK/$detach_target" '^## Task Index$'
check_contains "P7 target Task Index header" "$WORK/$detach_target" '^| W-id | Profile | Mode | Task record |$'
check_contains "P7 target stable key default" "$WORK/$detach_target" 'Stable package key: 2026-07-08-detached-package'
check_not_contains "P7 no repo integration default" "$WORK/$detach_target" 'logs/AGENTS.md#Package Log Repository Integration'
detach_task_record="logs/packages/2026-07-08-detached-package/tasks/W1.md"
check_status "P7 detached package task new auto-record succeeds" 0 "$PACKAGE_LOG" task new "$detach_target" --id W1 --auto-record --mode inline --task "Detached package task"
check_status_contains "P7 detached package lifecycle check succeeds" 0 'OK registry-integrity:' "$PACKAGE_LOG" check "$detach_target"

closed_source="$WORK/logs/2026-07-08-closed-source.md"
write_source_fixture "$closed_source"
sed 's/status: open/status: decided/' "$closed_source" > "$WORK/closed-source.tmp"
mv "$WORK/closed-source.tmp" "$closed_source"
closed_target="logs/2026-07-08-closed-detach.md"
check_fail_unchanged "P7 non-open source detach fails unchanged" "$closed_source" "$PACKAGE_LOG" controlling detach "$(repo_path "$closed_source")" --id W1 --target "$closed_target" --topic "Closed Detach" --description "Closed detach desc" --scope "docs/primary.md"
check_missing "P7 non-open source creates no target" "$WORK/$closed_target"

duplicate_target="logs/2026-07-08-detached-package-duplicate.md"
check_fail_unchanged "P7 duplicate detach fails unchanged" "$source_pkg" "$PACKAGE_LOG" controlling detach "$(repo_path "$source_pkg")" --id W1 --target "$duplicate_target" --topic "Duplicate Detached Package" --description "Duplicate desc" --scope "docs/primary.md"
check_missing "P7 duplicate detach creates no target" "$WORK/$duplicate_target"

existing_source="$WORK/logs/2026-07-08-existing-target-source.md"
existing_target="logs/2026-07-08-existing-target.md"
write_source_fixture "$existing_source"
printf 'existing target content\n' > "$WORK/$existing_target"
check_fail_unchanged "P7 existing target detach fails unchanged" "$existing_source" "$PACKAGE_LOG" controlling detach "$(repo_path "$existing_source")" --id W1 --target "$existing_target" --topic "Existing Target" --description "Existing target desc" --scope "docs/primary.md"
check_contains "P7 existing target preserved" "$WORK/$existing_target" '^existing target content$'

auto_source="$WORK/logs/2026-07-08-auto-detach-source.md"
write_source_fixture "$auto_source"
check_status "P7 controlling detach auto-target succeeds" 0 "$PACKAGE_LOG" controlling detach "$(repo_path "$auto_source")" --id W1 --topic "Auto Detached Package" --description "Auto detached desc" --scope "docs/primary.md"
check_contains "P7 auto-target path" "$WORK/out" 'logs/2026-07-08-Auto-Detached-Package\.md$'
check_contains "P7 auto-target source detached" "$auto_source" 'detached: .*logs/2026-07-08-Auto-Detached-Package\.md'

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
