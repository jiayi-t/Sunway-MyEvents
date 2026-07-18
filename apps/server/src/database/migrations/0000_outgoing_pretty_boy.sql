CREATE TABLE "event_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"event_id" integer,
	"viewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"date" timestamp NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"venue" varchar(255) NOT NULL,
	"pricing" numeric(10, 2) NOT NULL,
	"category" varchar(100) NOT NULL,
	"audience" varchar(20) DEFAULT 'everyone' NOT NULL,
	"capacity" integer,
	"registration_deadline" timestamp,
	"image_url" text,
	"organizer_id" integer,
	"created_at" timestamp DEFAULT now(),
	"cancelled_at" timestamp,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"event_id" integer,
	"rating" integer NOT NULL,
	"answers" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "feedback_user_id_event_id_unique" UNIQUE("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "feedback_ai_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"summary" jsonb NOT NULL,
	"feedback_count" integer NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	CONSTRAINT "feedback_ai_summaries_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "feedback_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"questions" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "feedback_forms_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "followed_organizers" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"organizer_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "followed_organizers_student_id_organizer_id_unique" UNIQUE("student_id","organizer_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"event_id" integer,
	"registered_at" timestamp DEFAULT now(),
	"checked_in_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "saved_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"event_id" integer,
	"saved_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"sunway_id" varchar(8) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'student',
	"program" text,
	"category" text,
	"interests" jsonb,
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	"gender" text,
	"faculty" text,
	"year_of_study" text,
	"mobile_number" text,
	"personal_email" text,
	"notification_preferences" jsonb,
	"social_links" jsonb,
	"about" text,
	"preferred_time_ranges" jsonb,
	"alumni" boolean,
	"token_version" integer DEFAULT 0 NOT NULL,
	"tour_completed_at" timestamp,
	CONSTRAINT "users_sunway_id_unique" UNIQUE("sunway_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "event_views" ADD CONSTRAINT "event_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_views" ADD CONSTRAINT "event_views_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_ai_summaries" ADD CONSTRAINT "feedback_ai_summaries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD CONSTRAINT "feedback_forms_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followed_organizers" ADD CONSTRAINT "followed_organizers_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followed_organizers" ADD CONSTRAINT "followed_organizers_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_events" ADD CONSTRAINT "saved_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_events" ADD CONSTRAINT "saved_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_views_user_id_idx" ON "event_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_views_event_id_idx" ON "event_views" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_organizer_id_idx" ON "events" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "feedback_event_id_idx" ON "feedback" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "followed_organizers_organizer_id_idx" ON "followed_organizers" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "registrations_user_id_idx" ON "registrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "registrations_event_id_idx" ON "registrations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "saved_events_user_id_idx" ON "saved_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_events_event_id_idx" ON "saved_events" USING btree ("event_id");