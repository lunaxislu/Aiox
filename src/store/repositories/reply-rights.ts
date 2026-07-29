import type Database from "better-sqlite3";

export interface StoredReplyRight {
  originatingDeliveryId: string;
  consumedReplyMessageId: string | null;
  consumedReplyDeliveryId: string | null;
  createdAt: string;
  consumedAt: string | null;
}

export interface ReplyRightRepository {
  grant(input: { originatingDeliveryId: string; now: string }): void;
  findByOriginatingDeliveryId(id: string): StoredReplyRight | null;
  consume(input: {
    originatingDeliveryId: string;
    replyMessageId: string;
    replyDeliveryId: string;
    now: string;
  }): boolean;
}

export function createReplyRightRepository(db: Database): ReplyRightRepository {
  return {
    grant(input) {
      db.prepare(
        `insert into reply_rights (originating_delivery_id, created_at) values (@originatingDeliveryId, @now)`,
      ).run(input);
    },
    findByOriginatingDeliveryId(id) {
      const row = db
        .prepare("select * from reply_rights where originating_delivery_id = ?")
        .get(id) as ReplyRightRow | undefined;
      return row ? mapReplyRightRow(row) : null;
    },
    consume(input) {
      return (
        db
          .prepare(
            `update reply_rights
             set consumed_reply_message_id = @replyMessageId,
                 consumed_reply_delivery_id = @replyDeliveryId,
                 consumed_at = @now
             where originating_delivery_id = @originatingDeliveryId
               and consumed_reply_message_id is null`,
          )
          .run(input).changes === 1
      );
    },
  };
}

interface ReplyRightRow {
  originating_delivery_id: string;
  consumed_reply_message_id: string | null;
  consumed_reply_delivery_id: string | null;
  created_at: string;
  consumed_at: string | null;
}

function mapReplyRightRow(row: ReplyRightRow): StoredReplyRight {
  return {
    originatingDeliveryId: row.originating_delivery_id,
    consumedReplyMessageId: row.consumed_reply_message_id,
    consumedReplyDeliveryId: row.consumed_reply_delivery_id,
    createdAt: row.created_at,
    consumedAt: row.consumed_at,
  };
}
