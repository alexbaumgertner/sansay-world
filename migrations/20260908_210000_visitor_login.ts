import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_visitor_sessions_ended_reason" AS ENUM('signed_out', 'revoked_by_owner', 'identity_removed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_enquiries_delivery_visitor_ack_status" AS ENUM('sent', 'failed', 'disabled');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_enquiries_delivery_reply_notice_status" AS ENUM('sent', 'failed', 'disabled');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "visitors" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "email" varchar NOT NULL,
      "first_seen_at" timestamp(3) with time zone,
      "last_signed_in_at" timestamp(3) with time zone,
      "active_session_count" numeric DEFAULT 0,
      "blocked_until" timestamp(3) with time zone,
      "revoke_all_sessions" boolean DEFAULT false,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "visitor_sessions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "visitor_id" uuid NOT NULL,
      "token_hash" varchar NOT NULL,
      "session_started_at" timestamp(3) with time zone NOT NULL,
      "expires_at" timestamp(3) with time zone NOT NULL,
      "revoked_at" timestamp(3) with time zone,
      "ended_reason" "enum_visitor_sessions_ended_reason",
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "login_codes" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "visitor_id" uuid NOT NULL,
      "code_hash" varchar NOT NULL,
      "issued_at" timestamp(3) with time zone NOT NULL,
      "expires_at" timestamp(3) with time zone NOT NULL,
      "consumed_at" timestamp(3) with time zone,
      "superseded_at" timestamp(3) with time zone,
      "attempt_count" numeric DEFAULT 0,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "login_throttle" (
      "key" text PRIMARY KEY NOT NULL,
      "count" integer DEFAULT 0 NOT NULL,
      "window_ends" timestamp(3) with time zone NOT NULL,
      "blocked_until" timestamp(3) with time zone
    );
  `)

  await db.execute(sql`
    ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "submitter_email" varchar;
    ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "owner_reply" varchar;
    ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "reply_notified_at" timestamp(3) with time zone;
    ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "delivery_visitor_ack_status" "enum_enquiries_delivery_visitor_ack_status";
    ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "delivery_visitor_ack_attempted_at" timestamp(3) with time zone;
    ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "delivery_visitor_ack_error" varchar;
    ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "delivery_reply_notice_status" "enum_enquiries_delivery_reply_notice_status";
    ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "delivery_reply_notice_attempted_at" timestamp(3) with time zone;
    ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "delivery_reply_notice_error" varchar;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      ALTER TABLE "login_codes" ADD CONSTRAINT "login_codes_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "visitors_email_idx" ON "visitors" USING btree ("email");
    CREATE UNIQUE INDEX IF NOT EXISTS "visitor_sessions_token_hash_idx" ON "visitor_sessions" USING btree ("token_hash");
    CREATE INDEX IF NOT EXISTS "visitor_sessions_visitor_id_idx" ON "visitor_sessions" USING btree ("visitor_id");
    CREATE INDEX IF NOT EXISTS "visitor_sessions_expires_at_idx" ON "visitor_sessions" USING btree ("expires_at");
    CREATE INDEX IF NOT EXISTS "login_codes_visitor_id_idx" ON "login_codes" USING btree ("visitor_id");
    CREATE INDEX IF NOT EXISTS "login_codes_expires_at_idx" ON "login_codes" USING btree ("expires_at");
    CREATE INDEX IF NOT EXISTS "enquiries_submitter_email_idx" ON "enquiries" USING btree ("submitter_email");
    CREATE INDEX IF NOT EXISTS "login_throttle_window_ends_idx" ON "login_throttle" USING btree ("window_ends");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "login_throttle" CASCADE;
    DROP TABLE IF EXISTS "login_codes" CASCADE;
    DROP TABLE IF EXISTS "visitor_sessions" CASCADE;
    DROP TABLE IF EXISTS "visitors" CASCADE;
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "delivery_reply_notice_error";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "delivery_reply_notice_attempted_at";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "delivery_reply_notice_status";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "delivery_visitor_ack_error";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "delivery_visitor_ack_attempted_at";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "delivery_visitor_ack_status";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "reply_notified_at";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "owner_reply";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "submitter_email";
    DROP TYPE IF EXISTS "public"."enum_enquiries_delivery_reply_notice_status";
    DROP TYPE IF EXISTS "public"."enum_enquiries_delivery_visitor_ack_status";
    DROP TYPE IF EXISTS "public"."enum_visitor_sessions_ended_reason";
  `)
}
