import { Router } from 'express'
import { eq, and, ne, isNull, gt, inArray, getTableColumns } from 'drizzle-orm'
import { db } from '../db'
import { events, users, registrations, saved_events, event_views, followed_organizers } from '../database/schema'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/recommendations - scored event recommendations for the authenticated student
router.get('/', authenticate, async (req: AuthRequest, res) => {
  const userId = req.user!.id

  // Content-based filtering
  try {
    // 1. User's selected interests + academic profile
    const [user] = await db
      .select({
        interests: users.interests,
        program: users.program,
        faculty: users.faculty,
        preferred_time_ranges: users.preferred_time_ranges,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    const preferences = (user?.interests as string[] | null) ?? []

    // 2. Fetch all behavioural signals in parallel
    const [userRegistrations, userSaves, userViews, followedOrgs] = await Promise.all([
      db
        .select({ event_id: registrations.event_id, checked_in_at: registrations.checked_in_at })
        .from(registrations)
        .where(eq(registrations.user_id, userId)),
      db
        .select({ event_id: saved_events.event_id })
        .from(saved_events)
        .where(eq(saved_events.user_id, userId)),
      db
        .select({ event_id: event_views.event_id })
        .from(event_views)
        .where(eq(event_views.user_id, userId)),
      db
        .select({ organizer_id: followed_organizers.organizer_id })
        .from(followed_organizers)
        .where(eq(followed_organizers.student_id, userId)),
    ])

    // 3. Look up categories for all interacted events
    const interactedIds = [
      ...new Set([
        ...userRegistrations.map(r => r.event_id!),
        ...userSaves.map(s => s.event_id!),
        ...userViews.map(v => v.event_id!),
      ]),
    ]

    let categoryMap: Record<number, string> = {}
    if (interactedIds.length > 0) {
      const rows = await db
        .select({ id: events.id, category: events.category })
        .from(events)
        .where(inArray(events.id, interactedIds))
      categoryMap = Object.fromEntries(rows.map(e => [e.id, e.category]))
    }

    // 4. Build category affinity scores
    const affinity: Record<string, number> = {}
    const add = (cat: string | null | undefined, weight: number) => {
      if (!cat) return
      affinity[cat] = (affinity[cat] ?? 0) + weight
    }

    for (const r of userRegistrations) {
      const cat = categoryMap[r.event_id!]
      add(cat, r.checked_in_at ? 5.0 : 3.0)
    }
    for (const s of userSaves) add(categoryMap[s.event_id!], 2.0)
    // count distinct views per event to avoid view-spamming inflating the score
    const viewCounts: Record<number, number> = {}
    for (const v of userViews) {
      const eid = v.event_id!
      viewCounts[eid] = (viewCounts[eid] ?? 0) + 1
    }
    for (const [eid, count] of Object.entries(viewCounts)) {
      add(categoryMap[Number(eid)], Math.min(count, 5) * 0.5)
    }
    for (const pref of preferences) add(pref, 1.0)

    // faculty baseline, maps to likely category interests
    const FACULTY_CATEGORY_MAP: Record<string, string[]> = {
      fass: ['Arts', 'Cultural', 'Social'],
      fet:  ['Academics', 'Social'],
      fmls: ['Academics', 'Social'],
      sbs:  ['Academics', 'Social'],
      shtm: ['Social', 'Cultural', 'Entertainment'],
      sms:  ['Academics'],
      cae:  ['Academics'],
      vu:   ['Academics', 'Social'],
    }
    const facultyCats = FACULTY_CATEGORY_MAP[(user?.faculty ?? '').toLowerCase()]
    if (facultyCats) for (const cat of facultyCats) add(cat, 0.5)

    // 5. Normalise to [0, 1]
    // converts the raw affinity scores into a relative score, so that the content-based score is comparable to the collaborative score
    const maxScore = Math.max(0, ...Object.values(affinity))
    const normAffinity: Record<string, number> = {}
    if (maxScore > 0) {
      for (const [cat, score] of Object.entries(affinity)) {
        normAffinity[cat] = score / maxScore
      }
    }

    // Collaborative filtering
    // fetch all other students' interactions with event categories
    const [otherRegs, otherSaves] = await Promise.all([
      db
        .select({ user_id: registrations.user_id, event_id: registrations.event_id, checked_in_at: registrations.checked_in_at })
        .from(registrations)
        .where(ne(registrations.user_id, userId)),
      db
        .select({ user_id: saved_events.user_id, event_id: saved_events.event_id })
        .from(saved_events)
        .where(ne(saved_events.user_id, userId)),
    ])

    const allInteractedIds = [...new Set([...otherRegs.map(r => r.event_id!), ...otherSaves.map(s => s.event_id!)])]
    let otherCategoryMap: Record<number, string> = {}
    if (allInteractedIds.length > 0) {
      const rows = await db
        .select({ id: events.id, category: events.category })
        .from(events)
        .where(inArray(events.id, allInteractedIds))
      otherCategoryMap = Object.fromEntries(rows.map(e => [e.id, e.category]))
    }

    // build per-user category vectors, same weights as own affinity
    const peerVectors: Record<number, Record<string, number>> = {}
    for (const r of otherRegs) {
      const cat = otherCategoryMap[r.event_id!]
      if (!cat) continue
      const uid = r.user_id!
      peerVectors[uid] ??= {}
      peerVectors[uid][cat] = (peerVectors[uid][cat] ?? 0) + (r.checked_in_at ? 5 : 3)
    }
    for (const s of otherSaves) {
      const cat = otherCategoryMap[s.event_id!]
      if (!cat) continue
      const uid = s.user_id!
      peerVectors[uid] ??= {}
      peerVectors[uid][cat] = (peerVectors[uid][cat] ?? 0) + 2
    }

    // compute cosine similarity between current user and all other users, then weigh their event interactions by similarity to produce a collaborative score for each event
    // fixes the categories to a consistent order, so that the vectors are comparable
    const CATS = ['Academics', 'Arts', 'Cultural', 'Entertainment', 'Social', 'Sports']
    // converts a category-weight map into a vector of weights in the fixed order of CATS
    const toVec = (v: Record<string, number>) => CATS.map(c => v[c] ?? 0)
    // multiplies two vectors element-wise and sums the result, high values indicate similar preference patterns
    const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0)
    // normalises a vector to unit length, so the direction of the vector matters more than its magnitude
    // a user with 100 interactions can be considered similar to a user with 10 interactions if their category preferences are the same
    const mag = (a: number[]) => Math.sqrt(a.reduce((s, x) => s + x * x, 0))
    // divides the dot product of two vectors by the product of their magnitudes, producing a value between 0 and 1 that indicates how similar the two vectors are
    const cosineSim = (a: number[], b: number[]) => {
      const m = mag(a) * mag(b)
      return m === 0 ? 0 : dot(a, b) / m
    }

    // converts the user's affinity scores into an array to map it to the category
    const currentVec = toVec(affinity)
    // the length of the current user's vector, used to check if the user has any interaction history 
    // if the magnitude is 0, the user has no history and collaborative filtering is skipped
    const currentMag = mag(currentVec)

    // top 5 neighbors by cosine similarity (skip if current user has no history)
    // KNN algorithm: find the K most similar users to the current user based on their category preference vectors
    const K = 5
    const neighbors: { uid: number; sim: number }[] = []
    if (currentMag > 0) {
      for (const [uid, vec] of Object.entries(peerVectors)) {
        const sim = cosineSim(currentVec, toVec(vec))
        if (sim > 0) neighbors.push({ uid: Number(uid), sim })
      }
      neighbors.sort((a, b) => b.sim - a.sim)
      neighbors.splice(K)
    }

    // event-level collaborative scores, weighted by neighbor similarity
    const collabMap: Record<number, number> = {}
    const neighborSet = new Set(neighbors.map(n => n.uid))
    const simByUid = Object.fromEntries(neighbors.map(n => [n.uid, n.sim]))
    for (const r of otherRegs) {
      if (!neighborSet.has(r.user_id!)) continue
      collabMap[r.event_id!] = (collabMap[r.event_id!] ?? 0) + simByUid[r.user_id!] * (r.checked_in_at ? 5 : 3)
    }
    for (const s of otherSaves) {
      if (!neighborSet.has(s.user_id!)) continue
      collabMap[s.event_id!] = (collabMap[s.event_id!] ?? 0) + simByUid[s.user_id!] * 2
    }
    const maxCollab = Math.max(0, ...Object.values(collabMap))

    // Event timing preferences
    // DB timestamps are UTC, MYT = UTC+8, bonus applies if the event timing matches the user's preferred time range (if set)
    const timePrefs = user?.preferred_time_ranges as { from: string; to: string } | null | undefined

    // 6. Fetch candidate events (upcoming, not archived, not cancelled)
    const followedOrgIds = new Set(followedOrgs.map(f => f.organizer_id!))
    const registeredIds = new Set(userRegistrations.map(r => r.event_id!))
    const now = new Date()

    const candidates = await db
      .select({
        ...getTableColumns(events),
        organizer_name: users.name,
        organizer_image_url: users.image_url,
      })
      .from(events)
      .leftJoin(users, eq(events.organizer_id, users.id))
      .where(
        and(
          isNull(events.archived_at),
          isNull(events.cancelled_at),
          gt(events.date, now),
          ...(req.user!.role === 'public' ? [ne(events.audience, 'students_only')] : []),
        )
      )

    // 7. Filter, score, sort
    const scored = candidates
      // removes events that the user has already registered for
      .filter(e => !registeredIds.has(e.id))
      // scores the remaining events
      .map(e => {
        // content-based score for event category, +0.3 if the event is organized by a followed organizer
        const normContent = (normAffinity[e.category] ?? 0) + (followedOrgIds.has(e.organizer_id!) ? 0.3 : 0)
        // how much the user's neighbors have interacted with this event, normalised to [0, 1] by the max collaborative score
        const normCollab = maxCollab > 0 ? (collabMap[e.id] ?? 0) / maxCollab : 0
        // blended score: 70% content-based, 30% collaborative, if no neighbors then purely content-based
        const blended = neighbors.length > 0 ? 0.7 * normContent + 0.3 * normCollab : normContent

        // time preference bonus: +0.2 if the event timing overlaps with the user's preferred time range
        let timeBonus = 0
        if (timePrefs?.from && timePrefs?.to) {
          const [fromH, fromM] = timePrefs.from.split(':').map(Number)
          const [toH, toM] = timePrefs.to.split(':').map(Number)
          const prefFrom = fromH * 60 + fromM
          const prefTo = toH * 60 + toM
          const startH = (new Date(e.start_time).getUTCHours() + 8) % 24
          const eventStart = startH * 60 + new Date(e.start_time).getUTCMinutes()
          const endH = (new Date(e.end_time).getUTCHours() + 8) % 24
          const eventEnd = endH * 60 + new Date(e.end_time).getUTCMinutes()
          if (eventStart < prefTo && eventEnd > prefFrom) timeBonus = 0.2
        }

        return { ...e, _score: blended + timeBonus }
      })
      // sorts by score descending, then by event date ascending to break ties
      .sort(
        (a, b) =>
          b._score - a._score ||
          new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      // returns only the event data, excluding the internal _score field
      .map(({ _score, ...e }) => e)

    res.json(scored)
  } catch (err) {
    console.error('Recommendations error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
