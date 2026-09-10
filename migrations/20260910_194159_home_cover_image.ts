import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds `home.cover_image_id` for the opening-screen cover (spec 003).
 *
 * `pnpm migrate:create` also emitted visitor-login DDL that already lives in
 * `20260908_210000_visitor_login` / `20260910_131500_visitor_rels_columns`
 * (local schema drift from a prior push). Those statements were removed so
 * this migration only adds the cover column, matching data-model.md.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "home" ADD COLUMN "cover_image_id" uuid;
    ALTER TABLE "home" ADD CONSTRAINT "home_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "home_cover_image_idx" ON "home" USING btree ("cover_image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "home_cover_image_idx";
    ALTER TABLE "home" DROP CONSTRAINT IF EXISTS "home_cover_image_id_media_id_fk";
    ALTER TABLE "home" DROP COLUMN IF EXISTS "cover_image_id";
  `)
}
