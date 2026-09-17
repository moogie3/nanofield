import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260917083647 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "sender_profile" ("id" text not null, "name" text not null, "phone" text not null, "address_1" text not null, "city" text not null, "province" text not null, "country_code" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "sender_profile_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_sender_profile_deleted_at" ON "sender_profile" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "sender_profile" cascade;`);
  }

}
