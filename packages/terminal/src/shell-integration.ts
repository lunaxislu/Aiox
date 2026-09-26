import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";

import { Clock, Duration, Effect, Option, Semaphore } from "effect";

export type ShellLaunch = {
    file: string;
    args: string[];
    env: Record<string, string>;
};

export type ShellIntegration = ShellLaunch & {
    busy(pid: number): Promise<boolean>;
    /** Requests shell-owned exit; the caller must still observe process exit. */
    close(pid: number): Promise<boolean>;
    dispose(): Promise<void>;
};

const quote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;
const execute = promisify(execFile);

/** Only a shell that installed the handshake may declare itself idle. */
export function prepareShell(input: ShellLaunch): ShellIntegration {
    const unsupported: ShellIntegration = {
        ...input,
        busy: async () => true,
        close: async () => false,
        dispose: async () => {},
    };
    if (process.platform === "win32") return unsupported;
    const name = basename(input.file);
    if (input.args.length || !["bash", "zsh", "fish"].includes(name))
        return unsupported;
    const directory = mkdtempSync(join(tmpdir(), "aiox-shell-"));
    const request = join(directory, "request");
    const response = join(directory, "response");
    const ready = join(directory, "ready");
    const home = input.env["HOME"] ?? "";
    const originalZdotdir = input.env["ZDOTDIR"] ?? home;
    const env = { ...input.env };
    let args: string[];
    const handler = `
__aiox_winch() {
    local action token
    [[ -r ${quote(request)} ]] || return 0
    IFS=' ' read -r action token < ${quote(request)} || return 0
    [[ $__aiox_idle = 1 && -z $(jobs -p) ]] || { printf '%s busy\\n' "$token" > ${quote(response)}; return 0; }
    if [[ $action = close ]]; then
        printf '%s closing\\n' "$token" > ${quote(response)}
        exit
    fi
    printf '%s idle\\n' "$token" > ${quote(response)}
}
`;
    try {
        if (name === "bash") {
            const script = join(directory, "bashrc");
            writeFileSync(
                script,
                `
[[ -f ${quote(join(home, ".bashrc"))} ]] && source ${quote(join(home, ".bashrc"))}
__aiox_cwd_prompt() { local previous=$?; printf '\\033]777;aiox-cwd\\007'; return "$previous"; }
if [[ $(declare -p PROMPT_COMMAND 2>/dev/null) == 'declare -a '* ]]; then
  PROMPT_COMMAND+=(__aiox_cwd_prompt)
else
  PROMPT_COMMAND+=$'\\n__aiox_cwd_prompt'
fi
if [[ -z $(trap -p WINCH) && -z $(trap -p DEBUG) ]]; then
${handler}
    __aiox_prompt() { local previous=$?; __aiox_idle=1; return "$previous"; }
    if [[ $(declare -p PROMPT_COMMAND 2>/dev/null) = 'declare -a '* ]]; then
        PROMPT_COMMAND+=(__aiox_prompt)
    else
        PROMPT_COMMAND+=$'\\n__aiox_prompt'
    fi
    if (( BASH_VERSINFO[0] > 4 || (BASH_VERSINFO[0] == 4 && BASH_VERSINFO[1] >= 4) )); then
        # PS0 runs before commands in this shell; its zero-length expansion emits no bytes.
        PS0+='\${__aiox_idle:0:$((__aiox_idle=0))}'
    else
        # macOS bash 3.2 has no PS0; its DEBUG trap exposes the actual handler command.
        trap '[[ $BASH_COMMAND = __aiox_prompt || $BASH_COMMAND = __aiox_winch ]] || __aiox_idle=0' DEBUG
    fi
    trap '__aiox_winch' WINCH
    : > ${quote(ready)}
fi
`,
                { mode: 0o600 },
            );
            args = ["--rcfile", script, "-i"];
        } else if (name === "zsh") {
            env["ZDOTDIR"] = directory;
            writeFileSync(
                join(directory, ".zshenv"),
                `
ZDOTDIR=${quote(originalZdotdir)}
[[ -f "$ZDOTDIR/.zshenv" ]] && source "$ZDOTDIR/.zshenv"
__aiox_zdotdir=$ZDOTDIR
ZDOTDIR=${quote(directory)}
`,
                { mode: 0o600 },
            );
            writeFileSync(
                join(directory, ".zshrc"),
                `
ZDOTDIR=$__aiox_zdotdir
# macOS /etc/zshrc derives HISTFILE before this wrapper restores ZDOTDIR.
[[ $HISTFILE = ${quote(join(directory, ".zsh_history"))} ]] && HISTFILE="$ZDOTDIR/.zsh_history"
[[ -f "$ZDOTDIR/.zshrc" ]] && source "$ZDOTDIR/.zshrc"
__aiox_cwd_prompt() { local previous=$?; printf '\\033]777;aiox-cwd\\007'; return "$previous"; }
precmd_functions+=(__aiox_cwd_prompt)
trap > ${quote(join(directory, "traps"))}
if [[ $(<${quote(join(directory, "traps"))}) != *WINCH* && \${+functions[TRAPWINCH]} = 0 ]]; then
${handler}
    __aiox_prompt() { local previous=$?; __aiox_idle=1; return "$previous"; }
    __aiox_preexec() { __aiox_idle=0; }
    precmd_functions+=(__aiox_prompt)
    preexec_functions+=(__aiox_preexec)
    trap '__aiox_winch' WINCH
    : > ${quote(ready)}
fi
`,
                { mode: 0o600 },
            );
            args = ["-i"];
        } else {
            const script = join(directory, "init.fish");
            writeFileSync(
                script,
                `
function __aiox_cwd_prompt --on-event fish_prompt
    set -l previous $status
    printf '\\033]777;aiox-cwd\\007'
    return $previous
end
# Keep fish's built-in repaint handler; any additional user WINCH handler is unknown.
if not functions --handlers | string match -r '^.*SIGWINCH[[:space:]]+.*$' | string match -qrv '^.*SIGWINCH[[:space:]]+__fish_winch_handler$'
    function __aiox_prompt --on-event fish_prompt
        set -g __aiox_idle 1
    end
    function __aiox_preexec --on-event fish_preexec
        set -g __aiox_idle 0
    end
    function __aiox_winch --on-signal WINCH
        test -r ${quote(request)}; or return
        read -l action token < ${quote(request)}; or return
        if test "$__aiox_idle" != 1; or test -n "$(jobs -p)"
            printf '%s busy\\n' "$token" > ${quote(response)}
            return
        end
        if test "$action" = close
            printf '%s closing\\n' "$token" > ${quote(response)}
            exit
        end
        printf '%s idle\\n' "$token" > ${quote(response)}
    end
    printf '' > ${quote(ready)}
end
`,
                { mode: 0o600 },
            );
            args = [
                "--interactive",
                "--init-command",
                `source ${quote(script)}`,
            ];
        }
    } catch (error) {
        rmSync(directory, { recursive: true, force: true });
        throw error;
    }
    const asking = Effect.runSync(Semaphore.make(1));
    const ask = (pid: number, action: "query" | "close"): Promise<boolean> =>
        Effect.runPromise(
            Effect.gen(function* () {
                const attempt = yield* Semaphore.withPermitsIfAvailable(
                    asking,
                    1,
                )(
                    Effect.gen(function* () {
                        const result = Effect.gen(function* () {
                            yield* Effect.try({
                                try: () => readFileSync(ready),
                                catch: (error) => error,
                            });
                            // job table omits disowned children. This conservative
                            // extra blocker never treats them as permission to exit.
                            const { stdout } = yield* Effect.tryPromise({
                                try: () =>
                                    execute(
                                        "/bin/ps",
                                        ["-axo", "pid=,ppid=,comm="],
                                        {
                                            timeout: 500,
                                            maxBuffer: 4 * 1024 * 1024,
                                        },
                                    ),
                                catch: (error) => error,
                            });
                            const rows = stdout
                                .trim()
                                .split("\n")
                                .map((row) =>
                                    row.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/),
                                );
                            if (
                                rows.some(
                                    (row) =>
                                        !row ||
                                        !Number.isSafeInteger(Number(row[1])) ||
                                        !Number.isSafeInteger(Number(row[2])),
                                )
                            )
                                return false;
                            const own = rows.find(
                                (row) => Number(row![1]) === pid,
                            );
                            if (
                                !own ||
                                basename(own[3]!) !== name ||
                                rows.some((row) => Number(row![2]) === pid)
                            )
                                return false;
                            const token = randomBytes(16).toString("hex");
                            yield* Effect.try({
                                try: () =>
                                    writeFileSync(
                                        request,
                                        `${action} ${token}\n`,
                                        { mode: 0o600 },
                                    ),
                                catch: (error) => error,
                            });
                            // Only the shell's own handler may acknowledge or exit.
                            yield* Effect.try({
                                try: () => process.kill(pid, "SIGWINCH"),
                                catch: (error) => error,
                            });
                            const deadline =
                                (yield* Clock.currentTimeMillis) + 500;
                            while (
                                (yield* Clock.currentTimeMillis) < deadline
                            ) {
                                const value = yield* Effect.try({
                                    try: () =>
                                        readFileSync(response, "utf8").trim(),
                                    catch: (error) => error,
                                }).pipe(Effect.catch(() => Effect.succeed("")));
                                if (value === `${token} busy`) return false;
                                if (
                                    value ===
                                    `${token} ${action === "close" ? "closing" : "idle"}`
                                )
                                    return true;
                                yield* Effect.clockWith((clock) =>
                                    clock.sleep(Duration.millis(10)),
                                );
                            }
                            return false;
                        });
                        return yield* result.pipe(
                            Effect.catch(() => Effect.succeed(false)),
                            Effect.ensuring(
                                Effect.sync(() =>
                                    rmSync(request, { force: true }),
                                ),
                            ),
                        );
                    }),
                );
                return Option.isSome(attempt) ? attempt.value : false;
            }),
        );
    return {
        file: input.file,
        args,
        env,
        busy: async (pid) => !(await ask(pid, "query")),
        close: (pid) => ask(pid, "close"),
        dispose: async () => {
            rmSync(directory, { recursive: true, force: true });
        },
    };
}
