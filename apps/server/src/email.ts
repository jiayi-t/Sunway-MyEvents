import nodemailer from 'nodemailer'
import previewEmail from 'preview-email'
import open from 'open'
import fs from 'fs'
import os from 'os'
import path from 'path'

// if no SMTP_HOST is set in env, we are in dev mode and will show email sent from the hardcoded email address
const DEV_MODE = !process.env.SMTP_HOST
const FROM = process.env.SMTP_FROM ?? 'Sunway MyEvents <noreply@sunway-myevents.com>'

// holds the nodemailer connection, so we don't create a new one for every email sent
let transporter: nodemailer.Transporter | null = null

// for prod, creates / reuses SMTP connection
async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return transporter
}

export async function sendEmail(to: string | string[], subject: string, html: string): Promise<void> {
  if (DEV_MODE) {
    // on a headless production server there is no browser to preview in, skip instead of hanging
    if (process.env.NODE_ENV === 'production') {
      console.warn(`SMTP not configured, skipping email "${subject}"`)
      return
    }
    // build a temporary HTML file and open it in the browser for preview
    const tmp = path.join(os.tmpdir(), `myevents-email-${Date.now()}.html`)
    // render the email using preview-email
    const raw = await (previewEmail as any)({ from: FROM, to, subject, html }, { returnHTML: true }) as string
    // override the sandbox attribute to allow popups and top navigation for redirect buttons to work
    fs.writeFileSync(tmp, raw.replace(/sandbox="allow-popups"/g, 'sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"'))
    // open the temp file in the browser
    open(tmp).catch(() => {})
    return
  }
  const t = await getTransporter()
  await t.sendMail({ from: FROM, to, subject, html })
}

export function getEmailAddresses(user: {
  email: string
  personal_email: string | null
  notification_preferences: { email_enabled?: boolean; email_channel?: string[] } | null
}): string[] {
  const prefs = user.notification_preferences
  // opt-out model: users who have never set preferences (null, e.g. auto-provisioned students) default to email notifications enabled
  if (prefs?.email_enabled === false) return []
  const channel = prefs?.email_channel
  const addresses: string[] = []
  if (!channel || channel.includes('imail')) addresses.push(user.email)
  if (channel?.includes('personal') && user.personal_email) addresses.push(user.personal_email)
  return addresses
}

// escape HTML special characters to prevent XSS (cross site scripting) attacks
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
          <tr>
            <td style="background:#003b7a;padding:20px 24px;text-align:center;">
              <span style="color:#ffffff;font-size:18px;font-weight:bold;">Sunway </span>
              <span style="color:#f97316;font-size:18px;font-weight:bold;">MyEvents</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <h2 style="margin:0 0 14px;color:#111827;font-size:18px;">${esc(title)}</h2>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:14px 24px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">This is an automated message from Sunway MyEvents. Do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function btn(url: string, label: string): string {
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#f97316;color:#ffffff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin-top:8px;">${label}</a>`
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(d: Date): string {
  return new Date(d).toLocaleTimeString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Email Templates 

export function forgotPasswordEmail(name: string, resetUrl: string): string {
  return layout('Reset Your Password', `
    <p style="margin:0 0 16px;color:#374151;font-size:14px;">Hi ${esc(name)},</p>
    <p style="margin:0 0 20px;color:#374151;font-size:14px;">
      We received a request to reset your Sunway MyEvents password.
      Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
    </p>
    ${btn(resetUrl, 'Reset Password')}
    <p style="margin:20px 0 0;color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
  `)
}

export function eventReminderEmail(eventName: string, date: Date, startTime: Date, venue: string): string {
  return layout('Event Reminder - Happening Today', `
    <p style="margin:0 0 16px;color:#374151;font-size:14px;">You have an event <strong>today</strong>:</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:80px;">Event</td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;font-weight:600;">${esc(eventName)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Date</td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;">${formatDate(date)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Time</td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;">${formatTime(startTime)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:13px;">Venue</td>
        <td style="padding:8px 0;color:#111827;font-size:13px;">${esc(venue)}</td>
      </tr>
    </table>
    <p style="margin:20px 0 0;color:#374151;font-size:13px;">Don't forget to show your QR code for check-in. See you there!</p>
  `)
}

export function eventCancelledEmail(eventName: string, date: Date): string {
  return layout('Event Cancelled', `
    <p style="margin:0 0 12px;color:#374151;font-size:14px;">We're sorry to inform you that the following event you've registered for has been <strong>cancelled</strong>:</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
      <p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:#111827;">${esc(eventName)}</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">${formatDate(date)}</p>
    </div>
    <p style="margin:0;color:#374151;font-size:13px;">We apologise for any inconvenience caused.</p>
  `)
}

export function eventUpdatedEmail(eventName: string, date: Date): string {
  return layout('Event Details Updated', `
    <p style="margin:0 0 12px;color:#374151;font-size:14px;">The details for an event you've registered for have been updated:</p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
      <p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:#111827;">${esc(eventName)}</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">${formatDate(date)}</p>
    </div>
    <p style="margin:0;color:#374151;font-size:13px;">Please open Sunway MyEvents to check the latest information.</p>
  `)
}

export function newEventEmail(eventName: string, organizerName: string, eventUrl: string): string {
  return layout(`New Event by ${esc(organizerName)}`, `
    <p style="margin:0 0 12px;color:#374151;font-size:14px;"><strong>${esc(organizerName)}</strong> just posted a new event:</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:15px;font-weight:bold;color:#111827;">${esc(eventName)}</p>
    </div>
    ${btn(eventUrl, 'View Event')}
  `)
}
