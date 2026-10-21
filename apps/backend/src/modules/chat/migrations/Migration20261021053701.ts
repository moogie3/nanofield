import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261021053701 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "chat_message" add column if not exists "image_url" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "chat_message" drop column if exists "image_url";`);
  }

}
