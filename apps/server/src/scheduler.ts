import cron from 'node-cron'
import { and, eq, gte, isNull, lt } from 'drizzle-orm'
import { db } from './db'
import { events, registrations, notifications, users } from './database/schema'
import { sendEmail, getEmailAddresses, eventReminderEmail } from './email'

let lastReminderDate: string | null = null

export async function sendEventReminders() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' })
  if (lastReminderDate === today) return
  lastReminderDate = today

  const todayStart = new Date(`${today}T00:00:00+08:00`)
  const todayEnd = new Date(`${today}T23:59:59+08:00`)

  const todayRegistrations = await db
    .select({
      user_id: registrations.user_id,
      event_name: events.name,
      event_date: events.date,
      event_start_time: events.start_time,
      event_venue: events.venue,
      email: users.email,
      personal_email: users.personal_email,
      notification_preferences: users.notification_preferences,
    })
    .from(registrations)
    .innerJoin(events, eq(registrations.event_id, events.id))
    .innerJoin(users, eq(registrations.user_id, users.id))
    .where(
      and(
        gte(events.date, todayStart),
        lt(events.date, todayEnd),
        isNull(events.cancelled_at),
        isNull(events.archived_at),
      )
    )

  if (todayRegistrations.length === 0) return

  await db.insert(notifications).values(
    todayRegistrations.map(r => ({
      user_id: r.user_id,
      type: 'event_reminder' as const,
      title: 'Event Today',
      message: `"${r.event_name}" is happening today. Don't forget to check in on time!`,
    }))
  )

  for (const r of todayRegistrations) {
    const addresses = getEmailAddresses({
      email: r.email,
      personal_email: r.personal_email,
      notification_preferences: r.notification_preferences as any,
    })
    if (addresses.length > 0) {
      sendEmail(
        addresses,
        `Reminder: ${r.event_name} is happening today!`,
        eventReminderEmail(r.event_name, new Date(r.event_date), new Date(r.event_start_time), r.event_venue)
      ).catch(err => console.error('[email]', err))
    }
  }

  console.log(`[scheduler] Sent ${todayRegistrations.length} event reminder(s) for ${today}`)
}

export function startScheduler() {
  // runs at 8:00 AM MYT (00:00 UTC) every day
  // min hr day month day-of-week
  cron.schedule('0 0 * * *', () => {
    sendEventReminders().catch(err => console.error('[scheduler] Error sending reminders:', err))
  }, { timezone: 'UTC' })
  console.log('[scheduler] Event reminder cron started')
}
