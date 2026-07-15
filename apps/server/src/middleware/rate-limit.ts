import rateLimit from 'express-rate-limit'
import type { Request } from 'express'

const msg = (error: string) => ({ error })

// global rate limiter: stops one machine from spamming the API
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg('Too many requests. Please slow down.'),
})

// per-IP login limit: stops one machine from trying many accounts, only failed logins count so a legit user will not get locked out
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg('Too many login attempts. Please try again in a few minutes.'),
})

// per-account login limit: stops many IPs from grinding one account's password, keyed on the submitted sunwayId (email for public users) and skipped when absent
export const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => `login-acct:${String(req.body?.sunwayId ?? '').toLowerCase().trim()}`,
  skip: (req: Request) => !req.body?.sunwayId,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg('Too many login attempts for this account. Please try again later.'),
})

// forgot password spam / account enumeration
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg('Too many password reset requests. Please try again later.'),
})

// mass fake-account creation shared across both register routes
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg('Too many accounts created from this network. Please try again later.'),
})

// reset-token guessing / bcrypt abuse
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg('Too many attempts. Please try again later.'),
})
