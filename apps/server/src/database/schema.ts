import { boolean, integer, jsonb, numeric, pgTable, varchar, text, timestamp, serial, unique, index, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  // unguessable identifier used in public URLs (/organizers/:id), integer id stays internal
  public_id: uuid('public_id').defaultRandom().notNull().unique(),
  // old integer id, backfilled only for rows that existed at the UUID migration (NULL for new rows) so legacy bookmarks resolve but new rows are not reachable by number
  legacy_numeric_id: integer('legacy_numeric_id').unique(),
  sunway_id: varchar('sunway_id', { length: 8 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('student'),
  program: text('program'),
  category: text('category'),
  interests: jsonb('interests'),
  image_url: text('image_url'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  gender: text('gender'),
  faculty: text('faculty'),
  year_of_study: text('year_of_study'),
  mobile_number: text('mobile_number'),
  personal_email: text('personal_email'),
  notification_preferences: jsonb('notification_preferences'),
  social_links: jsonb('social_links'),
  about: text('about'),
  preferred_time_ranges: jsonb('preferred_time_ranges'),
  alumni: boolean('alumni'),
  token_version: integer('token_version').default(0).notNull(),
  // students/public: first-login walkthrough seen (null = show it), organizers use a device-local flag instead
  tour_completed_at: timestamp('tour_completed_at', { withTimezone: true }),
})

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  // unguessable identifier used in public URLs (/events/:id), integer id stays internal
  public_id: uuid('public_id').defaultRandom().notNull().unique(),
  // old integer id, backfilled only for rows that existed at the UUID migration (NULL for new rows) so legacy bookmarks resolve but new rows are not reachable by number
  legacy_numeric_id: integer('legacy_numeric_id').unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  date: timestamp('date', { withTimezone: true }).notNull(),
  start_time: timestamp('start_time', { withTimezone: true }).notNull(),
  end_time: timestamp('end_time', { withTimezone: true }).notNull(),
  venue: varchar('venue', { length: 255 }).notNull(),
  pricing: numeric('pricing', { precision: 10, scale: 2 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  audience: varchar('audience', { length: 20 }).notNull().default('everyone'),
  capacity: integer('capacity'),
  registration_deadline: timestamp('registration_deadline', { withTimezone: true }),
  image_url: text('image_url'),
  organizer_id: integer('organizer_id').references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
  archived_at: timestamp('archived_at', { withTimezone: true })
}, (table) => [
  index('events_organizer_id_idx').on(table.organizer_id)
])

export const registrations = pgTable('registrations', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  event_id: integer('event_id').references(() => events.id),
  registered_at: timestamp('registered_at', { withTimezone: true }).defaultNow(),
  checked_in_at: timestamp('checked_in_at', { withTimezone: true })
}, (table) => [
  index('registrations_user_id_idx').on(table.user_id),
  index('registrations_event_id_idx').on(table.event_id)
])

export const saved_events = pgTable('saved_events', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  event_id: integer('event_id').references(() => events.id),
  saved_at: timestamp('saved_at', { withTimezone: true }).defaultNow()
}, (table) => [
  index('saved_events_user_id_idx').on(table.user_id),
  index('saved_events_event_id_idx').on(table.event_id)
])

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  event_id: integer('event_id').references(() => events.id),
  rating: integer('rating').notNull(),
  answers: jsonb('answers'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => [
  unique().on(table.user_id, table.event_id),
  index('feedback_event_id_idx').on(table.event_id)
])

export const feedback_forms = pgTable('feedback_forms', {
  id: serial('id').primaryKey(),
  event_id: integer('event_id').references(() => events.id).unique().notNull(),
  questions: jsonb('questions').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const feedback_ai_summaries = pgTable('feedback_ai_summaries', {
  id: serial('id').primaryKey(),
  event_id: integer('event_id').references(() => events.id).unique().notNull(),
  summary: jsonb('summary').notNull(),
  // feedback row count at generation time, regenerate when the live count differs
  feedback_count: integer('feedback_count').notNull(),
  generated_at: timestamp('generated_at', { withTimezone: true }).defaultNow()
})

export const event_views = pgTable('event_views', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  event_id: integer('event_id').references(() => events.id),
  viewed_at: timestamp('viewed_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('event_views_user_id_idx').on(table.user_id),
  index('event_views_event_id_idx').on(table.event_id),
])

export const followed_organizers = pgTable('followed_organizers', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').references(() => users.id),
  organizer_id: integer('organizer_id').references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  unique().on(table.student_id, table.organizer_id),
  index('followed_organizers_organizer_id_idx').on(table.organizer_id),
])

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  read_at: timestamp('read_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('notifications_user_id_idx').on(table.user_id)
])

export const password_reset_tokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id).notNull(),
  token_hash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  used_at: timestamp('used_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: integer('user_id').references(() => users.id).notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  last_activity_at: timestamp('last_activity_at', { withTimezone: true }).defaultNow(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('sessions_user_id_idx').on(table.user_id),
])
