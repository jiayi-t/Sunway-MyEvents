import bcrypt from 'bcryptjs'
import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { users, events } from './schema'

const seed = async () => {
  console.log('Seeding database...')

  const defaultPassword = await bcrypt.hash('sunway123', 10)

  const seedUsers = [
    {
      sunway_id: '22055313',
      email: '22055313@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'Tiong Jia Yi',
      role: 'student',
      program: 'Bachelor of Software Engineering (Hons)',
      category: null,
      interests: ['Entertainment', 'Social'],
      image_url: null,
      gender: 'Female',
      faculty: 'FET',
      year_of_study: 'Year 3',
      mobile_number: '+60 12-345 6789',
      personal_email: 'tiongjiayi6@gmail.com',
      notification_preferences: {
        email_enabled: true,
        email_channel: ['imail', 'personal'],
        course_related: true,
        interest_related: true,
        suggested: true,
      },
      about: null,
    },
    {
      sunway_id: '26011234',
      email: '26011234@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'Tester',
      role: 'student',
      program: 'Bachelor of Software Engineering (Hons)',
      category: null,
      interests: null,
      image_url: null,
      gender: 'Male',
      faculty: 'SBS',
      year_of_study: 'Pre-U',
      mobile_number: '+60 12-345 6789',
      personal_email: 'tester@gmail.com',
      notification_preferences: null,
      about: null,
    },
    {
      sunway_id: 'ssa',
      email: 'ssa@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'Sunway Student Ambassadors',
      role: 'organizer',
      program: null,
      category: 'SLB',
      interests: null,
      image_url: '/SSA Logo.jpg',
      gender: null,
      faculty: null,
      year_of_study: null,
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: 'A student leadership body made up of dedicated scholars from Sunway University and Sunway College KL.',
    }
  ]

  for (const user of seedUsers) {
    await db.insert(users).values(user).onConflictDoUpdate({
      target: users.sunway_id,
      set: {
        gender: user.gender,
        faculty: user.faculty,
        year_of_study: user.year_of_study,
        mobile_number: user.mobile_number,
        personal_email: user.personal_email,
        notification_preferences: user.notification_preferences,
        about: user.about ?? null,
      },
    })
  }
  console.log('Users seeded')

  const organizerResult = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.sunway_id, 'ssa'))

  const organizerId = organizerResult[0]?.id

  if (organizerId) {
    const seedEvents = [
      {
        name: "Sunway's Got Talent Season 7: Eternal Radiance Grand Finale",
        description: "Sunway's Got Talent (SGT) is an annual talent competition that celebrates the diverse talents of Sunway students and aims to cultivate a spirit of community engagement by encouraging students to contribute their 5Ts, Time, Talent, Treasure, Testimony, and Ties. \n\nCome witness the radiance of the Top 10 Finalists on stage, covering talents such as circus acts, harmonica, singing, dancing, and more!",
        date: new Date('2025-07-01T18:30:00'),
        start_time: new Date('2025-07-01T18:30:00'),
        end_time: new Date('2025-07-01T22:00:00'),
        venue: 'Sir Jeffrey Cheah Hall',
        category: 'Entertainment',
        pricing: '0',
        capacity: 1000,
        registration_deadline: null,
        image_url: '/SGT S7 Poster.jpg',
        organizer_id: organizerId,
      },
      {
        name: "Sunway's Got Talent Season 8: RE:VELATION Grand Finale",
        description: "Sunway's Got Talent (SGT) is an annual talent competition that celebrates the diverse talents of Sunway students and aims to cultivate a spirit of community engagement by encouraging students to contribute their 5Ts, Time, Talent, Treasure, Testimony, and Ties. \n\nCome witness the revelation of the Top 10 Finalists on stage!",
        date: new Date('2026-07-07T18:30:00'),
        start_time: new Date('2026-07-07T18:00:00'),
        end_time: new Date('2026-07-07T22:30:00'),
        venue: 'Sir Jeffrey Cheah Hall',
        category: 'Entertainment',
        pricing: '18',
        capacity: 1000,
        registration_deadline: null,
        image_url: '/SGT S8 Poster.jpg',
        organizer_id: organizerId,
      },
    ]

    for (const event of seedEvents) {
      const [existing] = await db
        .select({ id: events.id })
        .from(events)
        .where(and(eq(events.name, event.name), eq(events.organizer_id, organizerId)))
        .limit(1)
      // check if the event already exists, update if yes, insert if no
      if (existing) {
        await db.update(events).set(event).where(eq(events.id, existing.id))
      } else {
        await db.insert(events).values(event)
      }
    }

    console.log('Events seeded')
  }

  console.log('Seeding complete!')
  process.exit(0)
}

seed().catch(console.error)
