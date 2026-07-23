import { getTableColumns } from 'drizzle-orm'
import { events, users } from '../database/schema'

// column maps for client-facing event responses
// the public URL/identifier is the uuid, so we expose public_id as id and never send the internal integer id or legacy_numeric_id
const { id: _id, public_id: _publicId, legacy_numeric_id: _legacyId, organizer_id: _organizerId, ...restEventColumns } = getTableColumns(events)

// use when the query does NOT join the organizer (organizer_id is omitted entirely)
export const eventClientColumns = {
  ...restEventColumns,
  id: events.public_id,
}

// use when the query joins users as the organizer (organizer_id becomes the organizer's uuid)
export const eventClientColumnsWithOrganizer = {
  ...restEventColumns,
  id: events.public_id,
  organizer_id: users.public_id,
}
