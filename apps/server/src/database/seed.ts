import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
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
      semester: 9,
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
      semester: 5,
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
      semester: null,
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
        semester: user.semester,
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
    await db.insert(events).values({
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
      organizer_id: organizerId
    }).onConflictDoNothing()

    await db.insert(events).values({
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
      organizer_id: organizerId
    }).onConflictDoNothing()

    console.log('Events seeded')
  }

  console.log('Seeding complete!')
  process.exit(0)
}

seed().catch(console.error)
