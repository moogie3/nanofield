import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261017053816 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "content_page" drop constraint if exists "content_page_slug_locale_unique";`);
    this.addSql(`create table if not exists "content_page" ("id" text not null, "slug" text not null, "locale" text not null, "title" text not null, "subtitle" text null, "body" text not null default '', "status" text not null default 'published', "seo_title" text null, "seo_description" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_page_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_page_deleted_at" ON "content_page" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_content_page_slug_locale_unique" ON "content_page" ("slug", "locale") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "content_page" cascade;`);
  }

}
