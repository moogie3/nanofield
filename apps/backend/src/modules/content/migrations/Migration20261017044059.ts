import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261017044059 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "site_setting" drop constraint if exists "site_setting_key_locale_unique";`);
    this.addSql(`create table if not exists "site_setting" ("id" text not null, "key" text not null, "locale" text not null, "value" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "site_setting_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_site_setting_deleted_at" ON "site_setting" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_site_setting_key_locale_unique" ON "site_setting" ("key", "locale") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "site_setting" cascade;`);
  }

}
