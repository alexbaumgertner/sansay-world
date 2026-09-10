import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Repairs `20260908_210000_visitor_login`, which created the `visitors`,
 * `visitor_sessions` and `login_codes` collections but never added their
 * columns to Payload's polymorphic join tables `payload_locked_documents_rels`
 * and `payload_preferences_rels`.
 *
 * Without these, every `payload-preferences` read and every document delete
 * runs a query referencing `…_rels.visitors_id` and fails with
 * `column … does not exist` — which breaks the whole admin UI on any database
 * built from migrations (a clean local Docker DB, a fresh preview branch, CI).
 * Production only escaped this because its schema came from a dev-mode `push`.
 *
 * Every statement is guarded, so this is a safe no-op on a database that
 * already has the columns (i.e. production).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "visitors_id" uuid;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "visitor_sessions_id" uuid;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "login_codes_id" uuid;
    ALTER TABLE "payload_preferences_rels" ADD COLUMN IF NOT EXISTS "visitors_id" uuid;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_visitors_fk" FOREIGN KEY ("visitors_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_visitor_sessions_fk" FOREIGN KEY ("visitor_sessions_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_login_codes_fk" FOREIGN KEY ("login_codes_id") REFERENCES "public"."login_codes"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_visitors_fk" FOREIGN KEY ("visitors_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_visitors_id_idx" ON "payload_locked_documents_rels" USING btree ("visitors_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_visitor_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("visitor_sessions_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_login_codes_id_idx" ON "payload_locked_documents_rels" USING btree ("login_codes_id");
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_visitors_id_idx" ON "payload_preferences_rels" USING btree ("visitors_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_visitors_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_visitor_sessions_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_login_codes_id_idx";
    DROP INDEX IF EXISTS "payload_preferences_rels_visitors_id_idx";

    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_visitors_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_visitor_sessions_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_login_codes_fk";
    ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT IF EXISTS "payload_preferences_rels_visitors_fk";

    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "visitors_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "visitor_sessions_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "login_codes_id";
    ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "visitors_id";
  `)
}
