import type Database from "better-sqlite3";

import type { MessageType } from "../../core/messages.js";

export interface StoredMessage {
  id: string;
  sourceAgentId: string;
  parentMessageId: string | null;
  type: MessageType;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageInput {
  id: string;
  sourceAgentId: string;
  parentMessageId?: string | null;
  type: MessageType;
  content: string;
  now: string;
}

interface MessageRow {
  id: string;
  source_agent_id: string;
  parent_message_id: string | null;
  type: MessageType;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRepository {
  create(input: CreateMessageInput): StoredMessage;
  count(): number;
  list(): StoredMessage[];
}

export function createMessageRepository(db: Database): MessageRepository {
  return {
    create(input) {
      const message: StoredMessage = {
        id: input.id,
        sourceAgentId: input.sourceAgentId,
        parentMessageId: input.parentMessageId ?? null,
        type: input.type,
        content: input.content,
        createdAt: input.now,
        updatedAt: input.now,
      };

      db.prepare(
        `
          insert into messages (
            id,
            source_agent_id,
            parent_message_id,
            type,
            content,
            created_at,
            updated_at
          ) values (
            @id,
            @sourceAgentId,
            @parentMessageId,
            @type,
            @content,
            @createdAt,
            @updatedAt
          )
        `,
      ).run(message);

      return message;
    },

    count() {
      const row = db.prepare("select count(*) as count from messages").get() as {
        count: number;
      };
      return row.count;
    },

    list() {
      return db
        .prepare("select * from messages order by created_at, id")
        .all()
        .map((row) => mapMessageRow(row as MessageRow));
    },
  };
}

function mapMessageRow(row: MessageRow): StoredMessage {
  return {
    id: row.id,
    sourceAgentId: row.source_agent_id,
    parentMessageId: row.parent_message_id,
    type: row.type,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
