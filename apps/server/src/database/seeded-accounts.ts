// Usernames of the organizer accounts created by `npm run seed` (shared password: sunway123)
// GET /organizers filters to this list so the login page only surfaces accounts a tester can actually sign into, accounts registered through the app are excluded
// Keep in sync with the organizer entries in seed.ts (seed.ts warns if this drifts)
export const SEEDED_ORGANIZER_USERNAMES = [
  'ssa',
  'scc',
  'susc',
  'ssc',
  'ssv',
  'sgdc',
  'saibc',
  'sbcc',
  'csc',
  'sms',
  'sacc',
  'stc',
]

// Remove an account from the seeded list above to allow password and username changes
export const isSeededOrganizer = (sunwayId: string | null | undefined) =>
  !!sunwayId && SEEDED_ORGANIZER_USERNAMES.includes(sunwayId)

// Shared password for every account created by `npm run seed`
// Single source of truth: seed.ts hashes it, GET /organizers serves it to the login page
export const SEEDED_ACCOUNT_PASSWORD = 'sunway123'
