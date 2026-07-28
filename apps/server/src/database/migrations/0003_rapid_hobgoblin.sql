-- USING clauses added by hand (drizzle-kit does not generate them): without one, Postgres reinterprets existing values using the session's TimeZone instead of preserving them
-- AT TIME ZONE 'UTC' everywhere because Drizzle has always written UTC components into these naive columns, so this is value-preserving, it does not fix event times that were already wrong before storage 

ALTER TABLE "events" ALTER COLUMN "date" SET DATA TYPE timestamp with time zone USING "date" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "start_time" SET DATA TYPE timestamp with time zone USING "start_time" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "end_time" SET DATA TYPE timestamp with time zone USING "end_time" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "registration_deadline" SET DATA TYPE timestamp with time zone USING "registration_deadline" AT TIME ZONE 'UTC';--> statement-breakpoint

ALTER TABLE "events" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "cancelled_at" SET DATA TYPE timestamp with time zone USING "cancelled_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "archived_at" SET DATA TYPE timestamp with time zone USING "archived_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "event_views" ALTER COLUMN "viewed_at" SET DATA TYPE timestamp with time zone USING "viewed_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "event_views" ALTER COLUMN "viewed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "feedback_ai_summaries" ALTER COLUMN "generated_at" SET DATA TYPE timestamp with time zone USING "generated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "feedback_ai_summaries" ALTER COLUMN "generated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "feedback_forms" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "feedback_forms" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "followed_organizers" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "followed_organizers" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "read_at" SET DATA TYPE timestamp with time zone USING "read_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone USING "expires_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ALTER COLUMN "used_at" SET DATA TYPE timestamp with time zone USING "used_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "registrations" ALTER COLUMN "registered_at" SET DATA TYPE timestamp with time zone USING "registered_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "registrations" ALTER COLUMN "registered_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "registrations" ALTER COLUMN "checked_in_at" SET DATA TYPE timestamp with time zone USING "checked_in_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "saved_events" ALTER COLUMN "saved_at" SET DATA TYPE timestamp with time zone USING "saved_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "saved_events" ALTER COLUMN "saved_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone USING "expires_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "last_activity_at" SET DATA TYPE timestamp with time zone USING "last_activity_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "last_activity_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "tour_completed_at" SET DATA TYPE timestamp with time zone USING "tour_completed_at" AT TIME ZONE 'UTC';
