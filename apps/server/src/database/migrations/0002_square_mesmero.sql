ALTER TABLE "events" ADD COLUMN "public_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "legacy_numeric_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "public_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "legacy_numeric_id" integer;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_public_id_unique" UNIQUE("public_id");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_legacy_numeric_id_unique" UNIQUE("legacy_numeric_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_public_id_unique" UNIQUE("public_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_legacy_numeric_id_unique" UNIQUE("legacy_numeric_id");--> statement-breakpoint
-- backfill legacy_numeric_id for rows that existed before the UUID migration, so old numeric bookmarks still resolve, rows created after this stay NULL and are unreachable by number
UPDATE "events" SET "legacy_numeric_id" = "id" WHERE "legacy_numeric_id" IS NULL;--> statement-breakpoint
UPDATE "users" SET "legacy_numeric_id" = "id" WHERE "legacy_numeric_id" IS NULL;