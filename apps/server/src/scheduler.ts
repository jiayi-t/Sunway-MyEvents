import cron from 'node-cron'
import { and, eq, gte, isNull, lt } from 'drizzle-orm'
import { db } from './db'
import { events, registrations, notifications, users } from './database/schema'
import { sendEmail, getEmailAddresses, eventReminderEmail } from './email'
import { captureError } from './instrument'

let lastReminderDate: string | null = null

export async function sendEventReminders() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' })
  if (lastReminderDate === today) return

  const todayStart = new Date(`${today}T00:00:00+08:00`)
  const todayEnd = new Date(`${today}T23:59:59+08:00`)

  const todayRegistrations = await db
    .select({
      user_id: registrations.user_id,
      event_id: events.id,
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

  if (todayRegistrations.length > 0) {
    await db.insert(notifications).values(
      todayRegistrations.map(r => ({
        user_id: r.user_id,
        type: 'event_reminder' as const,
        title: 'Event Today',
        message: `"${r.event_name}" is happening today. Don't forget to check in on time!`,
        related_event_id: r.event_id,
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

  // mark done only after the query + insert succeed, if either throws, the error propagates and lastReminderDate stays unchanged so the run can be retried
  lastReminderDate = today
}

const RETRY_DELAY_MS = 5 * 60 * 1000 // 5 minutes
const MAX_ATTEMPTS = 3

// retry a failed run a few times within the day, sendEventReminders marks done only on success so a retry after a success will not send duplicate reminders
async function runRemindersWithRetry(attempt = 1) {
  try {
    await sendEventReminders()
  } catch (err) {
    console.error(`[scheduler] reminder run failed (attempt ${attempt}/${MAX_ATTEMPTS}):`, err)
    if (attempt < MAX_ATTEMPTS) {
      setTimeout(() => runRemindersWithRetry(attempt + 1), RETRY_DELAY_MS)
    } else {
      console.error(`[scheduler] giving up on reminders after ${MAX_ATTEMPTS} attempts`)
      // only reported once the retries are exhausted, a run that recovers is not worth an alert
      captureError(err)
    }
  }
}

export function startScheduler() {
  // runs at 8:00 AM MYT (00:00 UTC) every day
  // min hr day month day-of-week
  cron.schedule('0 0 * * *', () => {
    runRemindersWithRetry()
  }, { timezone: 'UTC' })
  console.log('[scheduler] Event reminder cron started')
}
