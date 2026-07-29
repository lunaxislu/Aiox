import type Database from "better-sqlite3";

import type {
  MessageIntent,
  MessageOriginKind,
  MessageType,
} from "../../core/messages.js";

export interface StoredMessage {
  id: string;
  sourceAgentId: string;
  originKind: MessageOriginKind;
  parentMessageId: string | null;
  type: MessageType;
  intent: MessageIntent | null;
  replyExpected: boolean | null;
  outcomeForDeliveryId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageInput {
  id: string;
  sourceAgentId: string;
  originKind?: MessageOriginKind;
  parentMessageId?: string | null;
  type: MessageType;
  intent?: MessageIntent;
  replyExpected?: boolean;
  outcomeForDeliveryId?: string | null;
  content: string;
  now: string;
}

interface MessageRow {
  id: string;
  source_agent_id: string;
  origin_kind: MessageOriginKind;
  parent_message_id: string | null;
  type: MessageType;
  intent: MessageIntent | null;
  reply_expected: number | null;
  outcome_for_delivery_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRepository {
  create(input: CreateMessageInput): StoredMessage;
  count(): number;
  findById(id: string): StoredMessage | null;
  list(): StoredMessage[];
}

export function createMessageRepository(db: Database): MessageRepository {
  return {
    create(input) {
      const message: StoredMessage = {
        id: input.id,
        sourceAgentId: input.sourceAgentId,
        originKind: input.originKind ?? "agent",
        parentMessageId: input.parentMessageId ?? null,
        type: input.type,
        intent: input.intent ?? null,
        replyExpected: input.replyExpected ?? null,
        outcomeForDeliveryId: input.outcomeForDeliveryId ?? null,
        content: input.content,
        createdAt: input.now,
        updatedAt: input.now,
      };

      if (
        message.parentMessageId !== null &&
        message.outcomeForDeliveryId !== null
      ) {
        throw new Error(
          "message cannot set both parentMessageId and outcomeForDeliveryId",
        );
      }

      db.prepare(
        `
          insert into messages (
            id,
            source_agent_id,
            origin_kind,
            parent_message_id,
            type,
            intent,
            reply_expected,
            outcome_for_delivery_id,
            content,
            created_at,
            updated_at
          ) values (
            @id,
            @sourceAgentId,
            @originKind,
            @parentMessageId,
            @type,
            @intent,
            @replyExpected,
            @outcomeForDeliveryId,
            @content,
            @createdAt,
            @updatedAt
          )
        `,
      ).run({
        ...message,
        replyExpected:
          message.replyExpected === null ? null : message.replyExpected ? 1 : 0,
      });

      return message;
    },

    count() {
      const row = db.prepare("select count(*) as count from messages").get() as {
        count: number;
      };
      return row.count;
    },

    findById(id) {
      const row = db.prepare("select * from messages where id = ?").get(id) as
        | MessageRow
        | undefined;
      return row ? mapMessageRow(row) : null;
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
    originKind: row.origin_kind,
    parentMessageId: row.parent_message_id,
    type: row.type,
    intent: row.intent,
    replyExpected: row.reply_expected === null ? null : row.reply_expected === 1,
    outcomeForDeliveryId: row.outcome_for_delivery_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
