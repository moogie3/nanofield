import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261021034658 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "chat_conversation" drop constraint if exists "chat_conversation_visitor_token_unique";`);
    this.addSql(`create table if not exists "chat_conversation" ("id" text not null, "customer_id" text null, "guest_name" text null, "guest_email" text null, "visitor_token" text null, "status" text not null default 'open', "admin_unread" integer not null default 0, "visitor_unread" integer not null default 0, "last_message_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "chat_conversation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_deleted_at" ON "chat_conversation" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_chat_conversation_visitor_token_unique" ON "chat_conversation" ("visitor_token") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_customer_id" ON "chat_conversation" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_status" ON "chat_conversation" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_last_message_at" ON "chat_conversation" ("last_message_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "chat_message" ("id" text not null, "conversation_id" text not null, "sender_type" text not null, "sender_label" text null, "body" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "chat_message_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_deleted_at" ON "chat_message" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_conversation_id" ON "chat_message" ("conversation_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_created_at" ON "chat_message" ("created_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "chat_conversation" cascade;`);

    this.addSql(`drop table if exists "chat_message" cascade;`);
  }

}
