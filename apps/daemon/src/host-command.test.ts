import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";

import { Deferred, Effect } from "effect";
import { expect, it } from "vitest";

import {
    HostCommands,
    type AdmittedHostCommand,
    type HostOutcome,
} from "./host-command";
import { HttpContext } from "./http-endpoint";
import { DaemonTasks } from "./tasks";
import { hostResult } from "./testing";

function context() {
    const incoming = new IncomingMessage(new Socket());
    return new HttpContext(
        new Request("http://localhost/api/hosts/run"),
        {},
        { incoming, outgoing: new ServerResponse(incoming) },
    );
}
it("joins accepted Host work and never returns a cached result or executes it twice", async (t) => {
    const tasks = new DaemonTasks();
    t.onTestFinished(() => tasks.close());
    const commands = new HostCommands({ tasks });
    const gate = Effect.runSync(Deferred.make<HostOutcome>());
    let runs = 0;
    let admissions = 0;
    const admit = async (): Promise<AdmittedHostCommand> => {
        admissions++;
        return {
            hostId: "33333333-3333-4333-8333-333333333333",
            agents: ["a1"],
            execute: () => {
                runs++;
                return Effect.runPromise(Deferred.await(gate));
            },
        };
    };
    const request = {
        requestId: "11111111-1111-4111-8111-111111111111",
        hash: "33333333-3333-4333-8333-333333333333",
        command: "host.run" as const,
    };
    const first = await commands.respond(context(), request, admit);
    const joined = await commands.respond(context(), request, admit);
    expect(commands.busy("33333333-3333-4333-8333-333333333333", "a1")).toBe(
        true,
    );
    expect(commands.busy("33333333-3333-4333-8333-333333333333", "a2")).toBe(
        false,
    );
    await expect(
        commands.respond(context(), { ...request, hash: "changed" }, admit),
    ).rejects.toMatchObject({ code: "request_conflict" });
    Effect.runSync(
        Deferred.succeed(gate, {
            hostId: "33333333-3333-4333-8333-333333333333",
            targets: [],
            error: {
                code: "launch_failed",
                message: "Actual failure",
                stage: "execution",
            },
        }),
    );
    const result = await hostResult(first);
    expect(await hostResult(joined)).toEqual(result);
    expect(result).toMatchObject({
        state: "failed",
        error: { message: "Actual failure" },
    });
    await expect(
        commands.respond(context(), request, admit),
    ).rejects.toMatchObject({ code: "result_expired" });
    expect(runs).toBe(1);
    expect(admissions).toBe(1);
    expect(commands.busy("33333333-3333-4333-8333-333333333333")).toBe(false);
});
it("keeps Host work alive after its NDJSON reader cancels", async (t) => {
    const tasks = new DaemonTasks();
    t.onTestFinished(() => tasks.close());
    const commands = new HostCommands({ tasks });
    const gate = Effect.runSync(Deferred.make<HostOutcome>());
    const response = await commands.respond(
        context(),
        {
            requestId: "22222222-2222-4222-8222-222222222222",
            hash: "44444444-4444-4444-8444-444444444444",
            command: "host.run",
        },
        async () => ({
            hostId: "44444444-4444-4444-8444-444444444444",
            agents: "all",
            execute: () => Effect.runPromise(Deferred.await(gate)),
        }),
    );
    await response.body!.cancel();
    expect(commands.busy("44444444-4444-4444-8444-444444444444")).toBe(true);
    Effect.runSync(
        Deferred.succeed(gate, {
            hostId: "44444444-4444-4444-8444-444444444444",
            targets: [],
        }),
    );
    await tasks.idle();
    expect(commands.busy("44444444-4444-4444-8444-444444444444")).toBe(false);
});
