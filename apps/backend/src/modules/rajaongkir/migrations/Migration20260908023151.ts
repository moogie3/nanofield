import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260908023151 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "shipping_service" ("id" text not null, "code" text not null, "courier" text not null, "service_code" text not null, "label" text not null, "cheapest_match" boolean not null default false, "is_enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shipping_service_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipping_service_deleted_at" ON "shipping_service" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "shipping_service" cascade;`);
  }

}
