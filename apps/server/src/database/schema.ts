import { integer, jsonb, numeric, pgTable, varchar, text, timestamp, serial, unique, index } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  sunway_id: varchar('sunway_id', { length: 8 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('student'),
  program: text('program'),
  category: text('category'),
  preferences: jsonb('preferences'),
  image_url: text('image_url'),
  created_at: timestamp('created_at').defaultNow()
})

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  date: timestamp('date').notNull(),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time').notNull(),
  venue: varchar('venue', { length: 255 }),
  pricing: numeric('pricing', { precision: 10, scale: 2 }),
  category: varchar('category', { length: 100 }),
  capacity: integer('capacity'),
  registration_deadline: timestamp('registration_deadline'),
  image_url: text('image_url'),
  organizer_id: integer('organizer_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
  cancelled_at: timestamp('cancelled_at'),
  archived_at: timestamp('archived_at')
}, (table) => [
  index('events_organizer_id_idx').on(table.organizer_id)
])

export const registrations = pgTable('registrations', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  event_id: integer('event_id').references(() => events.id),
  registered_at: timestamp('registered_at').defaultNow(),
  checked_in_at: timestamp('checked_in_at')
}, (table) => [
  index('registrations_user_id_idx').on(table.user_id),
  index('registrations_event_id_idx').on(table.event_id)
])

export const saved_events = pgTable('saved_events', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  event_id: integer('event_id').references(() => events.id),
  saved_at: timestamp('saved_at').defaultNow()
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
  created_at: timestamp('created_at').defaultNow()
}, (table) => [
  unique().on(table.user_id, table.event_id),
  index('feedback_event_id_idx').on(table.event_id)
])

export const feedback_forms = pgTable('feedback_forms', {
  id: serial('id').primaryKey(),
  event_id: integer('event_id').references(() => events.id).unique().notNull(),
  questions: jsonb('questions').notNull(),
  updated_at: timestamp('updated_at').defaultNow()
})
