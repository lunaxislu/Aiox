export type CommandName =
    | "daemon.start"
    | "daemon.stop"
    | "daemon.restart"
    | "daemon.status"
    | "adapter.install"
    | "adapter.uninstall"
    | "adapter.list"
    | "adapter.show"
    | "adapter.setup"
    | "adapter.doctor"
    | "agent.run"
    | "agent.list"
    | "agent.show"
    | "network.create"
    | "network.delete"
    | "network.list"
    | "network.show"
    | "network.block"
    | "network.unblock"
    | "network.reset"
    | "host.run"
    | "host.list"
    | "host.status"
    | "host.stop"
    | "host.agent.start"
    | "host.agent.stop"
    | "host.network.list"
    | "host.network.show"
    | "host.network.block"
    | "host.network.unblock"
    | "host.network.reset"
    | "status"
    | "doctor";

export type CliOptions = {
    name?: string;
    network?: string;
    role?: string;
    description?: string;
    instruction?: string;
    host?: string;
    all?: boolean;
    json?: boolean;
    force?: boolean;
    path?: string;
    worktree?: string;
    adapter?: string;
    port?: number;
    webPort?: number;
    between?: string[];
    from?: string;
    to?: string[];
};

export type CliRequest = {
    command: CommandName;
    args: (string | string[])[];
    options: CliOptions;
    adapterArgs?: string[];
};

/** The application/controller boundary. Parsing does not mutate SQLite or runtime state. */
export interface CliPort {
    execute(request: CliRequest): Promise<unknown>;
}
