import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261019044912 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "content_page" add column if not exists "data" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "content_page" drop column if exists "data";`);
  }

}
