import { sql } from "drizzle-orm";
import {
    sqliteTable,
    text,
    integer,
    primaryKey,
    unique,
    check,
    foreignKey,
} from "drizzle-orm/sqlite-core";

export const HostEntity = sqliteTable(
    "hosts",
    {
        id: text("id").notNull().primaryKey(),
        name: text("name").notNull().unique(),
        directory: text("directory").notNull(),
        sourceFile: text("source_file").notNull(),
        instruction: text("instruction").notNull(),
        revision: integer("revision").notNull(),
        createdAt: integer("created_at").notNull(),
    },
    (t) => [check("hosts_check_0", sql`${t.revision} > 0`)],
);

export const HostAgentEntity = sqliteTable(
    "host_agents",
    {
        hostId: text("host_id")
            .notNull()
            .references(() => HostEntity.id, { onDelete: "cascade" }),
        agentKey: text("agent_key").notNull(),
        ordinal: integer("ordinal").notNull(),
        adapter: text("adapter").notNull(),
        role: text("role"),
        description: text("description"),
        instruction: text("instruction").notNull(),
        argsJson: text("args_json").notNull(),
        lastTerminalId: text("last_terminal_id"),
        lastExitJson: text("last_exit_json"),
    },
    (t) => [
        primaryKey({ columns: [t.hostId, t.agentKey] }),
        unique().on(t.hostId, t.ordinal),
        check("host_agents_check_0", sql`${t.ordinal} >= 0`),
        check("host_agents_check_1", sql`${t.adapter} IN ('claude','codex')`),
        check("host_agents_check_2", sql`json_valid(${t.argsJson})`),
        check(
            "host_agents_check_3",
            sql`${t.lastExitJson} IS NULL OR json_valid(${t.lastExitJson})`,
        ),
    ],
);

export const HostNetworkEntity = sqliteTable(
    "host_networks",
    {
        id: text("id").notNull().primaryKey(),
        hostId: text("host_id")
            .notNull()
            .unique()
            .references(() => HostEntity.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        defaultPolicy: text("default_policy").notNull(),
    },
    (t) => [
        check(
            "host_networks_check_0",
            sql`${t.defaultPolicy} IN ('allow','deny')`,
        ),
    ],
);

export const HostMemberEntity = sqliteTable(
    "host_members",
    {
        networkId: text("network_id")
            .notNull()
            .references(() => HostNetworkEntity.id, { onDelete: "cascade" }),
        agentKey: text("agent_key").notNull(),
    },
    (t) => [primaryKey({ columns: [t.networkId, t.agentKey] })],
);

export const HostEdgeEntity = sqliteTable(
    "host_edges",
    {
        networkId: text("network_id").notNull(),
        fromKey: text("from_key").notNull(),
        toKey: text("to_key").notNull(),
        manifestPolicy: text("manifest_policy"),
        overridePolicy: text("override_policy"),
    },
    (t) => [
        primaryKey({ columns: [t.networkId, t.fromKey, t.toKey] }),
        foreignKey({
            columns: [t.networkId, t.fromKey],
            foreignColumns: [
                HostMemberEntity.networkId,
                HostMemberEntity.agentKey,
            ],
        }).onDelete("cascade"),
        foreignKey({
            columns: [t.networkId, t.toKey],
            foreignColumns: [
                HostMemberEntity.networkId,
                HostMemberEntity.agentKey,
            ],
        }).onDelete("cascade"),
        check("host_edges_check_0", sql`${t.fromKey} <> ${t.toKey}`),
        check(
            "host_edges_check_1",
            sql`${t.manifestPolicy} IN ('allow','deny')`,
        ),
        check(
            "host_edges_check_2",
            sql`${t.overridePolicy} IN ('allow','deny')`,
        ),
        check(
            "host_edges_check_3",
            sql`${t.manifestPolicy} IS NOT NULL OR ${t.overridePolicy} IS NOT NULL`,
        ),
    ],
);

export const PanelEntity = sqliteTable(
    "panels",
    {
        id: text("id").notNull().primaryKey(),
        kind: text("kind").notNull(),
        section: text("section").notNull(),
        name: text("name").notNull(),
        hostId: text("host_id")
            .unique()
            .references(() => HostEntity.id, { onDelete: "cascade" }),
        networkId: text("network_id"),
        revision: integer("revision").notNull(),
        layoutJson: text("layout_json").notNull(),
        activePaneId: text("active_pane_id").notNull(),
    },
    (t) => [
        check(
            "panels_check_0",
            sql`${t.kind} IN ('host','workspace','network')`,
        ),
        check(
            "panels_check_1",
            sql`${t.section} IN ('hosts','workspaces','networks')`,
        ),
        check("panels_check_2", sql`${t.revision} > 0`),
        check("panels_check_3", sql`json_valid(${t.layoutJson})`),
    ],
);
export type PanelRow = typeof PanelEntity.$inferSelect;

export const PanelTabEntity = sqliteTable(
    "panel_tabs",
    {
        id: text("id").notNull().primaryKey(),
        panelId: text("panel_id")
            .notNull()
            .references(() => PanelEntity.id, { onDelete: "cascade" }),
        terminalId: text("terminal_id").unique(),
        label: text("label").notNull(),
        agentKey: text("agent_key"),
        presentation: text("presentation").notNull(),
        noticeJson: text("notice_json"),
    },
    (t) => [
        check(
            "panel_tabs_check_0",
            sql`${t.presentation} IN ('shell','preparing','tui','stopped','start-failed','crashed','unavailable')`,
        ),
        check(
            "panel_tabs_check_1",
            sql`${t.noticeJson} IS NULL OR json_valid(${t.noticeJson})`,
        ),
    ],
);

export const HostOperationEntity = sqliteTable(
    "host_operations",
    {
        id: text("id").notNull().primaryKey(),
        requestId: text("request_id").notNull().unique(),
        requestHash: text("request_hash").notNull(),
        kind: text("kind").notNull(),
        hostId: text("host_id"),
        panelId: text("panel_id"),
        state: text("state").notNull(),
        targetsJson: text("targets_json").notNull(),
        errorJson: text("error_json"),
        cleanupErrorsJson: text("cleanup_errors_json").notNull(),
        createdAt: integer("created_at").notNull(),
        finishedAt: integer("finished_at"),
    },
    (t) => [
        check(
            "host_operations_check_0",
            sql`${t.state} IN ('running','succeeded','failed')`,
        ),
        check("host_operations_check_1", sql`json_valid(${t.targetsJson})`),
        check(
            "host_operations_check_2",
            sql`${t.errorJson} IS NULL OR json_valid(${t.errorJson})`,
        ),
        check(
            "host_operations_check_3",
            sql`json_valid(${t.cleanupErrorsJson})`,
        ),
        check(
            "host_operations_check_4",
            sql`(${t.state}='running')=(${t.finishedAt} IS NULL)`,
        ),
    ],
);
export type HostOperationRow = typeof HostOperationEntity.$inferSelect;

export const HostExecutionEntity = sqliteTable(
    "host_executions",
    {
        runtimeId: text("runtime_id").notNull().primaryKey(),
        hostId: text("host_id").notNull(),
        agentKey: text("agent_key").notNull(),
        terminalId: text("terminal_id").notNull(),
        startedAt: integer("started_at").notNull(),
        endedAt: integer("ended_at"),
        exitJson: text("exit_json"),
    },
    (t) => [
        check(
            "host_executions_check_0",
            sql`${t.exitJson} IS NULL OR json_valid(${t.exitJson})`,
        ),
    ],
);

/** SQLite trigger complements the cross-table membership constraint. */
export const HOST_MEMBER_TRIGGER =
    "CREATE TRIGGER IF NOT EXISTS host_members_agent BEFORE INSERT ON host_members WHEN NOT EXISTS (SELECT 1 FROM host_agents a JOIN host_networks n ON n.host_id=a.host_id WHERE n.id=NEW.network_id AND a.agent_key=NEW.agent_key) BEGIN SELECT RAISE(ABORT,'unknown_host_agent'); END";
