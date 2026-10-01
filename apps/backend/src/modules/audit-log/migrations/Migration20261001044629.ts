import { Migration } from "@medusajs/framework/mikro-orm/migrations"

// Read-path indexes for the audit log (the base migration only indexed
// deleted_at). The admin page lists newest-first (`created_at` DESC) and
// filters by actor, so both need indexes before the table grows — every
// admin mutation writes a row, bounded only by the audit-retention job.
export class Migration20261001044629 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_entry_created_at" ON "audit_entry" ("created_at" DESC);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_entry_actor_id" ON "audit_entry" ("actor_id");`);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_audit_entry_actor_id";`);
    this.addSql(`DROP INDEX IF EXISTS "IDX_audit_entry_created_at";`);
  }

}
