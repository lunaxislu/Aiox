import { EntitySchema } from "typeorm";

export type HostRow = {
    id: string;
    name: string;
    directory: string;
    sourceFile: string;
    instruction: string;
    revision: number;
    createdAt: number;
};
export type HostAgentRow = {
    hostId: string;
    agentKey: string;
    ordinal: number;
    adapter: string;
    role: string | null;
    description: string | null;
    instruction: string;
    argsJson: string;
    lastTerminalId: string | null;
    lastExitJson: string | null;
};
export type HostNetworkRow = {
    id: string;
    hostId: string;
    name: string;
    defaultPolicy: string;
};
export type HostMemberRow = { networkId: string; agentKey: string };
export type HostEdgeRow = {
    networkId: string;
    fromKey: string;
    toKey: string;
    manifestPolicy: string | null;
    overridePolicy: string | null;
};
export type PanelRow = {
    id: string;
    kind: string;
    section: string;
    name: string;
    hostId: string | null;
    networkId: string | null;
    revision: number;
    layoutJson: string;
    activePaneId: string;
};
export type PanelTabRow = {
    id: string;
    panelId: string;
    terminalId: string | null;
    label: string;
    agentKey: string | null;
    presentation: string;
    noticeJson: string | null;
};
export type HostOperationRow = {
    id: string;
    requestId: string;
    requestHash: string;
    kind: string;
    hostId: string | null;
    panelId: string | null;
    state: string;
    targetsJson: string;
    errorJson: string | null;
    cleanupErrorsJson: string;
    createdAt: number;
    finishedAt: number | null;
};
export type HostExecutionRow = {
    runtimeId: string;
    hostId: string;
    agentKey: string;
    terminalId: string;
    startedAt: number;
    endedAt: number | null;
    exitJson: string | null;
};
const key = { type: "text", primary: true } as const;
const text = { type: "text" } as const;
const nullable = { type: "text", nullable: true } as const;
const integer = { type: "integer" } as const;
export const HostEntity = new EntitySchema<HostRow>({
    name: "host",
    tableName: "hosts",
    columns: {
        id: key,
        name: text,
        directory: text,
        sourceFile: { ...text, name: "source_file" },
        instruction: text,
        revision: integer,
        createdAt: { ...integer, name: "created_at" },
    },
});
export const HostAgentEntity = new EntitySchema<HostAgentRow>({
    name: "host_agent",
    tableName: "host_agents",
    columns: {
        hostId: { ...key, name: "host_id" },
        agentKey: { ...key, name: "agent_key" },
        ordinal: integer,
        adapter: text,
        role: nullable,
        description: nullable,
        instruction: text,
        argsJson: { ...text, name: "args_json" },
        lastTerminalId: { ...nullable, name: "last_terminal_id" },
        lastExitJson: { ...nullable, name: "last_exit_json" },
    },
});
export const HostNetworkEntity = new EntitySchema<HostNetworkRow>({
    name: "host_network",
    tableName: "host_networks",
    columns: {
        id: key,
        hostId: { ...text, name: "host_id" },
        name: text,
        defaultPolicy: { ...text, name: "default_policy" },
    },
});
export const HostMemberEntity = new EntitySchema<HostMemberRow>({
    name: "host_member",
    tableName: "host_members",
    columns: {
        networkId: { ...key, name: "network_id" },
        agentKey: { ...key, name: "agent_key" },
    },
});
export const HostEdgeEntity = new EntitySchema<HostEdgeRow>({
    name: "host_edge",
    tableName: "host_edges",
    columns: {
        networkId: { ...key, name: "network_id" },
        fromKey: { ...key, name: "from_key" },
        toKey: { ...key, name: "to_key" },
        manifestPolicy: { ...nullable, name: "manifest_policy" },
        overridePolicy: { ...nullable, name: "override_policy" },
    },
});
export const PanelEntity = new EntitySchema<PanelRow>({
    name: "panel",
    tableName: "panels",
    columns: {
        id: key,
        kind: text,
        section: text,
        name: text,
        hostId: { ...nullable, name: "host_id" },
        networkId: { ...nullable, name: "network_id" },
        revision: integer,
        layoutJson: { ...text, name: "layout_json" },
        activePaneId: { ...text, name: "active_pane_id" },
    },
});
export const PanelTabEntity = new EntitySchema<PanelTabRow>({
    name: "panel_tab",
    tableName: "panel_tabs",
    columns: {
        id: key,
        panelId: { ...text, name: "panel_id" },
        terminalId: { ...nullable, name: "terminal_id" },
        label: text,
        agentKey: { ...nullable, name: "agent_key" },
        presentation: text,
        noticeJson: { ...nullable, name: "notice_json" },
    },
});
export const HostOperationEntity = new EntitySchema<HostOperationRow>({
    name: "host_operation",
    tableName: "host_operations",
    columns: {
        id: key,
        requestId: { ...text, name: "request_id" },
        requestHash: { ...text, name: "request_hash" },
        kind: text,
        hostId: { ...nullable, name: "host_id" },
        panelId: { ...nullable, name: "panel_id" },
        state: text,
        targetsJson: { ...text, name: "targets_json" },
        errorJson: { ...nullable, name: "error_json" },
        cleanupErrorsJson: { ...text, name: "cleanup_errors_json" },
        createdAt: { ...integer, name: "created_at" },
        finishedAt: { ...integer, nullable: true, name: "finished_at" },
    },
});
export const HostExecutionEntity = new EntitySchema<HostExecutionRow>({
    name: "host_execution",
    tableName: "host_executions",
    columns: {
        runtimeId: { ...key, name: "runtime_id" },
        hostId: { ...text, name: "host_id" },
        agentKey: { ...text, name: "agent_key" },
        terminalId: { ...text, name: "terminal_id" },
        startedAt: { ...integer, name: "started_at" },
        endedAt: { ...integer, nullable: true, name: "ended_at" },
        exitJson: { ...nullable, name: "exit_json" },
    },
});
export const HOST_ENTITIES = [
    HostEntity,
    HostAgentEntity,
    HostNetworkEntity,
    HostMemberEntity,
    HostEdgeEntity,
    PanelEntity,
    PanelTabEntity,
    HostOperationEntity,
    HostExecutionEntity,
];
export const HOST_SCHEMA = [
    `CREATE TABLE IF NOT EXISTS hosts (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL UNIQUE, directory TEXT NOT NULL, source_file TEXT NOT NULL, instruction TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision > 0), created_at INTEGER NOT NULL) STRICT`,
    `CREATE TABLE IF NOT EXISTS host_agents (host_id TEXT NOT NULL REFERENCES hosts(id) ON DELETE CASCADE, agent_key TEXT NOT NULL, ordinal INTEGER NOT NULL CHECK(ordinal >= 0), adapter TEXT NOT NULL CHECK(adapter IN ('claude','codex')), role TEXT, description TEXT, instruction TEXT NOT NULL, args_json TEXT NOT NULL CHECK(json_valid(args_json)), last_terminal_id TEXT, last_exit_json TEXT CHECK(last_exit_json IS NULL OR json_valid(last_exit_json)), PRIMARY KEY(host_id,agent_key), UNIQUE(host_id,ordinal)) STRICT`,
    `CREATE TABLE IF NOT EXISTS host_networks (id TEXT PRIMARY KEY NOT NULL, host_id TEXT NOT NULL UNIQUE REFERENCES hosts(id) ON DELETE CASCADE, name TEXT NOT NULL, default_policy TEXT NOT NULL CHECK(default_policy IN ('allow','deny'))) STRICT`,
    `CREATE TABLE IF NOT EXISTS host_members (network_id TEXT NOT NULL REFERENCES host_networks(id) ON DELETE CASCADE, agent_key TEXT NOT NULL, PRIMARY KEY(network_id,agent_key)) STRICT`,
    `CREATE TRIGGER IF NOT EXISTS host_members_agent BEFORE INSERT ON host_members WHEN NOT EXISTS (SELECT 1 FROM host_agents a JOIN host_networks n ON n.host_id=a.host_id WHERE n.id=NEW.network_id AND a.agent_key=NEW.agent_key) BEGIN SELECT RAISE(ABORT,'unknown_host_agent'); END`,
    `CREATE TABLE IF NOT EXISTS host_edges (network_id TEXT NOT NULL, from_key TEXT NOT NULL, to_key TEXT NOT NULL CHECK(from_key <> to_key), manifest_policy TEXT CHECK(manifest_policy IN ('allow','deny')), override_policy TEXT CHECK(override_policy IN ('allow','deny')), CHECK(manifest_policy IS NOT NULL OR override_policy IS NOT NULL), PRIMARY KEY(network_id,from_key,to_key), FOREIGN KEY(network_id,from_key) REFERENCES host_members(network_id,agent_key) ON DELETE CASCADE, FOREIGN KEY(network_id,to_key) REFERENCES host_members(network_id,agent_key) ON DELETE CASCADE) STRICT`,
    `CREATE TABLE IF NOT EXISTS panels (id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('host','workspace','network')), section TEXT NOT NULL CHECK(section IN ('hosts','workspaces','networks')), name TEXT NOT NULL, host_id TEXT UNIQUE REFERENCES hosts(id) ON DELETE CASCADE, network_id TEXT, revision INTEGER NOT NULL CHECK(revision > 0), layout_json TEXT NOT NULL CHECK(json_valid(layout_json)), active_pane_id TEXT NOT NULL) STRICT`,
    `CREATE TABLE IF NOT EXISTS panel_tabs (id TEXT PRIMARY KEY NOT NULL, panel_id TEXT NOT NULL REFERENCES panels(id) ON DELETE CASCADE, terminal_id TEXT UNIQUE, label TEXT NOT NULL, agent_key TEXT, presentation TEXT NOT NULL CHECK(presentation IN ('shell','preparing','tui','stopped','start-failed','crashed','unavailable')), notice_json TEXT CHECK(notice_json IS NULL OR json_valid(notice_json))) STRICT`,
    `CREATE TABLE IF NOT EXISTS host_operations (id TEXT PRIMARY KEY NOT NULL, request_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL, kind TEXT NOT NULL, host_id TEXT, panel_id TEXT, state TEXT NOT NULL CHECK(state IN ('running','succeeded','failed')), targets_json TEXT NOT NULL CHECK(json_valid(targets_json)), error_json TEXT CHECK(error_json IS NULL OR json_valid(error_json)), cleanup_errors_json TEXT NOT NULL CHECK(json_valid(cleanup_errors_json)), created_at INTEGER NOT NULL, finished_at INTEGER, CHECK((state='running')=(finished_at IS NULL))) STRICT`,
    `CREATE TABLE IF NOT EXISTS host_executions (runtime_id TEXT PRIMARY KEY NOT NULL, host_id TEXT NOT NULL, agent_key TEXT NOT NULL, terminal_id TEXT NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER, exit_json TEXT CHECK(exit_json IS NULL OR json_valid(exit_json))) STRICT`,
];
