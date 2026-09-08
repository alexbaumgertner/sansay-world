import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_visitor_sessions_ended_reason" AS ENUM('signed_out', 'revoked_by_owner', 'identity_removed');
    CREATE TYPE "public"."enum_enquiries_delivery_visitor_ack_status" AS ENUM('sent', 'failed', 'disabled');
    CREATE TYPE "public"."enum_enquiries_delivery_reply_notice_status" AS ENUM('sent', 'failed', 'disabled');

    CREATE TABLE "visitors" (
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

    CREATE TABLE "visitor_sessions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "visitor_id" uuid NOT NULL,
      "token_hash" varchar NOT NULL,
      "created_at" timestamp(3) with time zone NOT NULL,
      "expires_at" timestamp(3) with time zone NOT NULL,
      "revoked_at" timestamp(3) with time zone,
      "ended_reason" "enum_visitor_sessions_ended_reason",
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE "login_codes" (
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

    CREATE TABLE "login_throttle" (
      "key" text PRIMARY KEY NOT NULL,
      "count" integer DEFAULT 0 NOT NULL,
      "window_ends" timestamp(3) with time zone NOT NULL,
      "blocked_until" timestamp(3) with time zone
    );

    ALTER TABLE "enquiries" ADD COLUMN "submitter_email" varchar;
    ALTER TABLE "enquiries" ADD COLUMN "owner_reply" varchar;
    ALTER TABLE "enquiries" ADD COLUMN "reply_notified_at" timestamp(3) with time zone;
    ALTER TABLE "enquiries" ADD COLUMN "delivery_visitor_ack_status" "enum_enquiries_delivery_visitor_ack_status";
    ALTER TABLE "enquiries" ADD COLUMN "delivery_visitor_ack_attempted_at" timestamp(3) with time zone;
    ALTER TABLE "enquiries" ADD COLUMN "delivery_visitor_ack_error" varchar;
    ALTER TABLE "enquiries" ADD COLUMN "delivery_reply_notice_status" "enum_enquiries_delivery_reply_notice_status";
    ALTER TABLE "enquiries" ADD COLUMN "delivery_reply_notice_attempted_at" timestamp(3) with time zone;
    ALTER TABLE "enquiries" ADD COLUMN "delivery_reply_notice_error" varchar;

    ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "login_codes" ADD CONSTRAINT "login_codes_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;

    CREATE UNIQUE INDEX "visitors_email_idx" ON "visitors" USING btree ("email");
    CREATE UNIQUE INDEX "visitor_sessions_token_hash_idx" ON "visitor_sessions" USING btree ("token_hash");
    CREATE INDEX "visitor_sessions_visitor_id_idx" ON "visitor_sessions" USING btree ("visitor_id");
    CREATE INDEX "visitor_sessions_expires_at_idx" ON "visitor_sessions" USING btree ("expires_at");
    CREATE INDEX "login_codes_visitor_id_idx" ON "login_codes" USING btree ("visitor_id");
    CREATE INDEX "login_codes_expires_at_idx" ON "login_codes" USING btree ("expires_at");
    CREATE INDEX "enquiries_submitter_email_idx" ON "enquiries" USING btree ("submitter_email");
    CREATE INDEX "login_throttle_window_ends_idx" ON "login_throttle" USING btree ("window_ends");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "login_throttle" CASCADE;
    DROP TABLE "login_codes" CASCADE;
    DROP TABLE "visitor_sessions" CASCADE;
    DROP TABLE "visitors" CASCADE;
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "delivery_reply_notice_error";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "delivery_reply_notice_attempted_at";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "delivery_reply_notice_status";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "delivery_visitor_ack_error";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "delivery_visitor_ack_attempted_at";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "delivery_visitor_ack_status";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "reply_notified_at";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "owner_reply";
    ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "submitter_email";
    DROP TYPE "public"."enum_enquiries_delivery_reply_notice_status";
    DROP TYPE "public"."enum_enquiries_delivery_visitor_ack_status";
    DROP TYPE "public"."enum_visitor_sessions_ended_reason";
  `)
}
