// UAT only, remove once user acceptance testing is done
// Testers whose accounts have no past events cannot test the feedback flow
// Backfill a checked-in past event for all student and public accounts on login

import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { events, registrations } from './schema'

export const UAT_PAST_EVENT_NAME = "Sunway's Got Talent Season 8: RE:VELATION Grand Finale"

export const uatPastEventEnabled = () => process.env.UAT_SEED_PAST_EVENT === 'true'

// registers the user for the seeded past event and marks them checked in
export const attachUatPastEvent = async (user_id: number) => {
  try {
    const [event] = await db
      .select({ id: events.id, start_time: events.start_time })
      .from(events)
      .where(eq(events.name, UAT_PAST_EVENT_NAME))
      .limit(1)
    if (!event) return

    const [existing] = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(and(eq(registrations.user_id, user_id), eq(registrations.event_id, event.id)))
      .limit(1)
    if (existing) return

    await db.insert(registrations).values({
      user_id,
      event_id: event.id,
      checked_in_at: event.start_time,
    })
  } catch (err) {
    console.error('UAT past-event attach failed:', err)
  }
}
