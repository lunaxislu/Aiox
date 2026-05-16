import Database from "better-sqlite3";
import type { DatabaseInstance } from "better-sqlite3";

export type AgentStatus = "connected" | "disconnected";
export type MessageStatus =
  | "queued"
  | "delivering"
  | "delivered"
  | "completed"
  | "failed";

export type AioxStore = {
  db: DatabaseInstance;
  journalMode: string;
};

export type AgentRecord = {
  id: string;
  name: string;
  kind: string;
  status: AgentStatus;
  cwd: string;
  adapterSessionId: string | null;
};

export type RouteRecord = {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  status: string;
};

export type MessageRecord = {
  id: string;
  routeId: string;
  sourceAgentId: string;
  targetAgentId: string;
  type: string;
  status: MessageStatus;
  idempotencyKey: string;
  content: string;
  parentMessageId?: string | null;
};

export type EventRecord = {
  id: string;
  agentId?: string | null;
  messageId?: string | null;
  type: string;
  data: unknown;
};

export type LateReplyInput = {
  id: string;
  routeId: string;
  sourceAgentId: string;
  targetAgentId: string;
  parentMessageId: string;
  idempotencyKey: string;
  content: string;
};

export type RestartRecoveryResult = {
  disconnectedAgents: number;
  requeuedMessages: number;
};

export function createAioxStore(dbPath: string): AioxStore {
  const db = new Database(dbPath);
  const journalMode = enableAndReadJournalMode(db);
  applySchema(db);
  return { db, journalMode };
}

export function closeAioxStore(store: AioxStore) {
  store.db.close();
}

export function saveAgent(store: AioxStore, agent: AgentRecord) {
  store.db
    .prepare(
      `
        insert into agents (id, name, kind, status, cwd, adapter_session_id)
        values (@id, @name, @kind, @status, @cwd, @adapterSessionId)
      `,
    )
    .run(agent);
}

export function saveRoute(store: AioxStore, route: RouteRecord) {
  store.db
    .prepare(
      `
        insert into routes (id, source_agent_id, target_agent_id, status)
        values (@id, @sourceAgentId, @targetAgentId, @status)
      `,
    )
    .run(route);
}

export function saveMessage(store: AioxStore, message: MessageRecord) {
  store.db
    .prepare(
      `
        insert into messages (
          id,
          route_id,
          source_agent_id,
          target_agent_id,
          parent_message_id,
          type,
          status,
          idempotency_key,
          content
        )
        values (
          @id,
          @routeId,
          @sourceAgentId,
          @targetAgentId,
          @parentMessageId,
          @type,
          @status,
          @idempotencyKey,
          @content
        )
      `,
    )
    .run({ parentMessageId: null, ...message });
}

export function recordEvent(store: AioxStore, event: EventRecord) {
  store.db
    .prepare(
      `
        insert into events (id, agent_id, message_id, type, data_json)
        values (@id, @agentId, @messageId, @type, @dataJson)
      `,
    )
    .run({
      id: event.id,
      agentId: event.agentId ?? null,
      messageId: event.messageId ?? null,
      type: event.type,
      dataJson: JSON.stringify(event.data),
    });
}

export function recordLateReply(store: AioxStore, reply: LateReplyInput) {
  const transaction = store.db.transaction(() => {
    saveMessage(store, {
      ...reply,
      type: "reply",
      status: "completed",
    });
    recordEvent(store, {
      id: `late-reply-${reply.id}`,
      messageId: reply.id,
      type: "late_reply",
      data: { parentMessageId: reply.parentMessageId },
    });
  });

  transaction();
}

export function recoverAfterRestart(store: AioxStore): RestartRecoveryResult {
  const connectedAgents = listAgents(store).filter(
    (agent) => agent.status === "connected",
  );
  const inFlightMessages = listMessages(store).filter(
    (message) => message.status === "delivering",
  );

  const transaction = store.db.transaction(() => {
    for (const agent of connectedAgents) {
      store.db
        .prepare("update agents set status = 'disconnected' where id = ?")
        .run(agent.id);
      recordEvent(store, {
        id: `restart-agent-${agent.id}`,
        agentId: agent.id,
        type: "agent_disconnected_after_restart",
        data: { previousStatus: agent.status },
      });
    }

    for (const message of inFlightMessages) {
      store.db
        .prepare("update messages set status = 'queued' where id = ?")
        .run(message.id);
      recordEvent(store, {
        id: `restart-message-${message.id}`,
        messageId: message.id,
        type: "restart_requeued",
        data: { previousStatus: message.status, nextStatus: "queued" },
      });
    }
  });

  transaction();

  return {
    disconnectedAgents: connectedAgents.length,
    requeuedMessages: inFlightMessages.length,
  };
}

export function listAgents(store: AioxStore): AgentRecord[] {
  return store.db
    .prepare(
      `
        select
          id,
          name,
          kind,
          status,
          cwd,
          adapter_session_id as adapterSessionId
        from agents
        order by id
      `,
    )
    .all() as AgentRecord[];
}

export function listRoutes(store: AioxStore): RouteRecord[] {
  return store.db
    .prepare(
      `
        select
          id,
          source_agent_id as sourceAgentId,
          target_agent_id as targetAgentId,
          status
        from routes
        order by id
      `,
    )
    .all() as RouteRecord[];
}

export function listMessages(store: AioxStore): MessageRecord[] {
  return store.db
    .prepare(
      `
        select
          id,
          route_id as routeId,
          source_agent_id as sourceAgentId,
          target_agent_id as targetAgentId,
          parent_message_id as parentMessageId,
          type,
          status,
          idempotency_key as idempotencyKey,
          content
        from messages
        order by id
      `,
    )
    .all() as MessageRecord[];
}

export function listEvents(store: AioxStore): EventRecord[] {
  const rows = store.db
    .prepare(
      `
        select
          id,
          agent_id as agentId,
          message_id as messageId,
          type,
          data_json as dataJson
        from events
        order by id
      `,
    )
    .all() as Array<{
    id: string;
    agentId: string | null;
    messageId: string | null;
    type: string;
    dataJson: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    agentId: row.agentId,
    messageId: row.messageId,
    type: row.type,
    data: JSON.parse(row.dataJson) as unknown,
  }));
}

function enableAndReadJournalMode(db: DatabaseInstance) {
  const row = db.pragma("journal_mode = WAL", { simple: true });
  return String(row).toLowerCase();
}

function applySchema(db: DatabaseInstance) {
  db.exec(`
    create table if not exists agents (
      id text primary key,
      name text not null,
      kind text not null,
      status text not null,
      cwd text not null,
      adapter_session_id text
    );

    create table if not exists routes (
      id text primary key,
      source_agent_id text not null references agents(id),
      target_agent_id text not null references agents(id),
      status text not null
    );

    create table if not exists messages (
      id text primary key,
      route_id text not null references routes(id),
      source_agent_id text not null references agents(id),
      target_agent_id text not null references agents(id),
      parent_message_id text references messages(id),
      type text not null,
      status text not null,
      idempotency_key text not null unique,
      content text not null
    );

    create table if not exists events (
      id text primary key,
      agent_id text references agents(id),
      message_id text references messages(id),
      type text not null,
      data_json text not null
    );
  `);
}
