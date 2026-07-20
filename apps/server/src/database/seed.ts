import bcrypt from 'bcryptjs'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '../db'
import { users, events, registrations, saved_events, feedback } from './schema'
import { SEEDED_ORGANIZER_USERNAMES } from './seeded-accounts'

const seed = async () => {
  console.log('Seeding database...')

  const defaultPassword = await bcrypt.hash('sunway123', 10)

  const seedUsers = [
    // Students
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
      program: 'Foundation in Arts',
      category: null,
      interests: null,
      image_url: null,
      gender: 'Male',
      faculty: null,
      year_of_study: 'Pre-U',
      mobile_number: '+60 12-345 6789',
      personal_email: 'tester@gmail.com',
      notification_preferences: null,
      about: null,
    },
    // Group A (FET)
    {
      sunway_id: '23061001',
      email: '23061001@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'FET Student 1',
      role: 'student',
      program: 'BSc (Hons) Information Technology (Computer Networking and Security)',
      category: null,
      interests: ['Academics', 'Social'],
      image_url: null,
      gender: 'Male',
      faculty: 'FET',
      year_of_study: 'Year 2',
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    {
      sunway_id: '24061002',
      email: '24061002@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'FET Student 2',
      role: 'student',
      program: 'Bachelor of Science (Honours) in Computer Science',
      category: null,
      interests: ['Academics', 'Social'],
      image_url: null,
      gender: 'Female',
      faculty: 'FET',
      year_of_study: 'Year 1',
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    // Group B (FASS)
    {
      sunway_id: '23061003',
      email: '23061003@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'FASS Student 1',
      role: 'student',
      program: 'Bachelor of Arts (Honours) in Advertising and Branding',
      category: null,
      interests: ['Arts', 'Cultural', 'Entertainment'],
      image_url: null,
      gender: 'Female',
      faculty: 'FASS',
      year_of_study: 'Year 2',
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    {
      sunway_id: '22061004',
      email: '22061004@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'FASS Student 2',
      role: 'student',
      program: 'Bachelor of Arts (Honours) Contemporary Music (Audio Technology)',
      category: null,
      interests: ['Arts', 'Cultural', 'Entertainment'],
      image_url: null,
      gender: 'Male',
      faculty: 'FASS',
      year_of_study: 'Year 3',
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    // Group C (SHTM)
    {
      sunway_id: '23061005',
      email: '23061005@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'SHTM Student 1',
      role: 'student',
      program: 'Bachelor of Science (Honours) in International Hospitality Management',
      category: null,
      interests: ['Social', 'Cultural', 'Entertainment'],
      image_url: null,
      gender: 'Female',
      faculty: 'SHTM',
      year_of_study: 'Year 2',
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    // Group D (SBS)
    {
      sunway_id: '24061006',
      email: '24061006@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'SBS Student 1',
      role: 'student',
      program: 'Bachelor of Science (Hons) in Accounting and Finance',
      category: null,
      interests: ['Academics', 'Social'],
      image_url: null,
      gender: 'Male',
      faculty: 'SBS',
      year_of_study: 'Year 1',
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    // SLBs
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
    },
    {
      sunway_id: 'scc',
      email: 'scc@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'Sunway College Student Council',
      role: 'organizer',
      program: null,
      category: 'SLB',
      interests: null,
      image_url: null,
      gender: null,
      faculty: null,
      year_of_study: null,
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    {
      sunway_id: 'susc',
      email: 'susc@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'Sunway University Student Council',
      role: 'organizer',
      program: null,
      category: 'SLB',
      interests: null,
      image_url: null,
      gender: null,
      faculty: null,
      year_of_study: null,
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    {
      sunway_id: 'ssc',
      email: 'ssc@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'Sunway Sports Council',
      role: 'organizer',
      program: null,
      category: 'SLB',
      interests: null,
      image_url: null,
      gender: null,
      faculty: null,
      year_of_study: null,
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    {
      sunway_id: 'ssv',
      email: 'ssv@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'Sunway Student Volunteers',
      role: 'organizer',
      program: null,
      category: 'SLB',
      interests: null,
      image_url: null,
      gender: null,
      faculty: null,
      year_of_study: null,
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    // C&S
    {
      sunway_id: 'sgdc',
      email: 'sgdc@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'Sunway Game Development Club',
      role: 'organizer',
      program: null,
      category: 'General Interest',
      interests: null,
      image_url: null,
      gender: null,
      faculty: null,
      year_of_study: null,
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    {
      sunway_id: 'saibc',
      email: 'saibc@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'Sunway AI Builders Club',
      role: 'organizer',
      program: null,
      category: 'General Interest',
      interests: null,
      image_url: null,
      gender: null,
      faculty: null,
      year_of_study: null,
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    {
      sunway_id: 'sbcc',
      email: 'sbcc@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'Sunway Blockchain Club',
      role: 'organizer',
      program: null,
      category: 'General Interest',
      interests: null,
      image_url: null,
      gender: null,
      faculty: null,
      year_of_study: null,
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    {
      sunway_id: 'csc',
      email: 'csc@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'Sunway Cybersecurity Club',
      role: 'organizer',
      program: null,
      category: 'General Interest',
      interests: null,
      image_url: null,
      gender: null,
      faculty: null,
      year_of_study: null,
      mobile_number: null,
      notification_preferences: null,
      about: null,
    },
    {
      sunway_id: 'sms',
      email: 'sms@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'Sunway Music Society',
      role: 'organizer',
      program: null,
      category: 'Art & Music',
      interests: null,
      image_url: null,
      gender: null,
      faculty: null,
      year_of_study: null,
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    {
      sunway_id: 'sacc',
      email: 'sacc@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'Sunway Art and Craft Club',
      role: 'organizer',
      program: null,
      category: 'Art & Music',
      interests: null,
      image_url: null,
      gender: null,
      faculty: null,
      year_of_study: null,
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
    {
      sunway_id: 'stc',
      email: 'stc@imail.sunway.edu.my',
      password: defaultPassword,
      name: 'Sunway Tech Club',
      role: 'organizer',
      program: null,
      category: 'General Interest',
      interests: null,
      image_url: null,
      gender: null,
      faculty: null,
      year_of_study: null,
      mobile_number: null,
      personal_email: null,
      notification_preferences: null,
      about: null,
    },
  ]

  // the login page uses SEEDED_ORGANIZER_USERNAMES to show which accounts still use the seed password, so warn if an organizer is seeded here without being listed there
  const seededOrganizers = seedUsers.filter(u => u.role === 'organizer').map(u => u.sunway_id)
  const missing = seededOrganizers.filter(id => !SEEDED_ORGANIZER_USERNAMES.includes(id))
  if (missing.length > 0) {
    console.warn(`⚠ add to SEEDED_ORGANIZER_USERNAMES in seeded-accounts.ts: ${missing.join(', ')}`)
  }

  for (const user of seedUsers) {
    await db.insert(users).values(user).onConflictDoUpdate({
      target: users.sunway_id,
      set: {
        name: user.name,
        program: user.program,
        category: user.category,
        interests: user.interests,
        image_url: user.image_url,
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

  const allUsers = await db.select({ id: users.id, sunway_id: users.sunway_id }).from(users)
  const idMap: Record<string, number> = Object.fromEntries(allUsers.map(u => [u.sunway_id, u.id]))

  const allEvents = [
    {
      organizer: 'ssa',
      name: "Sunway's Got Talent Season 7: Eternal Radiance Grand Finale",
      description: "Sunway's Got Talent (SGT) is an annual talent competition that celebrates the diverse talents of Sunway students and aims to cultivate a spirit of community engagement by encouraging students to contribute their 5Ts, Time, Talent, Treasure, Testimony, and Ties. \n\nCome witness the radiance of the Top 10 Finalists on stage, covering talents such as circus acts, harmonica, singing, dancing, and more!",
      date: '2025-07-01T18:30:00',
      start_time: '2025-07-01T18:30:00',
      end_time: '2025-07-01T22:00:00',
      venue: 'Sir Jeffrey Cheah Hall, Sunway College',
      category: 'Entertainment',
      pricing: '0',
      capacity: 1000,
      registration_deadline: null,
      image_url: '/SGT S7 Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'ssa',
      name: "Sunway's Got Talent Season 8: RE:VELATION Grand Finale",
      description: "Sunway's Got Talent (SGT) is an annual talent competition that celebrates the diverse talents of Sunway students and aims to cultivate a spirit of community engagement by encouraging students to contribute their 5Ts, Time, Talent, Treasure, Testimony, and Ties. \n\nCome witness the revelation of the Top 10 Finalists on stage!",
      date: '2026-07-07T18:30:00',
      start_time: '2026-07-07T18:00:00',
      end_time: '2026-07-07T22:30:00',
      venue: 'Sir Jeffrey Cheah Hall, Sunway College',
      category: 'Entertainment',
      pricing: '18',
      capacity: 1000,
      registration_deadline: null,
      image_url: '/SGT S8 Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'ssa',
      name: 'café 101: Beyond the Matcha Latte',
      description: "Step into a café-inspired environment and learn how modern matcha beverages are crafted, from flavour pairing and presentation to beverage creation techniques.\n\n✨ What you'll experience:\n• Learn matcha fundamentals and preparation techniques\n• Create multiple café-style matcha beverages\n• Explore flavour combinations and beverage innovation\n• Gain hands-on drink-making experience\n• Take home your very own exclusive matcha set\n\n☕ In collaboration with OYEN COFFEE LAB\nA specialty beverage brand known for its coffee and matcha pop-ups, wholesale offerings, and innovative beverage creations.\n\n🎟 Ticket Price includes workshop materials and an exclusive matcha set worth RM160",
      date: '2026-08-04T19:00:00',
      start_time: '2026-08-04T19:00:00',
      end_time: '2026-08-04T21:30:00',
      venue: 'Rooftop Terrace, Sunway College',
      pricing: '75',
      capacity: 30,
      registration_deadline: null,
      category: 'Social',
      image_url: '/Cafe 101 Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'susc',
      name: 'Freshman Fiesta: 2.0: Golden Groves',
      date: '2026-04-30T20:30:00',
      start_time: '2026-04-30T20:30:00',
      end_time: '2026-04-30T22:30:00',
      venue: 'Sir Jeffrey Cheah Hall, Sunway College',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Social',
      image_url: '/Golden Groves Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'ssc',
      name: 'WuShu Jomplay',
      date: '2026-05-26T19:00:00',
      start_time: '2026-05-26T19:00:00',
      end_time: '2026-05-26T21:00:00',
      venue: 'Rooftop Terrace, Sunway College',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Sports',
      image_url: '/WuShu Jomplay Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'ssc',
      name: 'Strike with the Sharks',
      date: '2025-10-18T10:30:00',
      start_time: '2025-10-18T10:30:00',
      end_time: '2025-10-18T14:00:00',
      venue: 'Art Gallery, Level 1, Sunway University',
      pricing: '5',
      capacity: null,
      registration_deadline: null,
      category: 'Sports',
      image_url: '/Strike with the Sharks Poster.jpg',
      cancelled: true,
    },
    {
      organizer: 'sgdc',
      name: 'Gaming Law: Know Your Rights?',
      date: '2026-05-13T18:00:00',
      start_time: '2026-05-13T18:00:00',
      end_time: '2026-05-13T21:30:00',
      venue: 'Lecture Theatre 6, Sunway University',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Academics',
      image_url: '/Gaming Law Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'sgdc',
      name: 'Unityverse: Unity Workshop',
      date: '2025-07-23T18:00:00',
      start_time: '2025-07-23T18:00:00',
      end_time: '2025-07-23T21:30:00',
      venue: 'Lecture Theatre 4, Sunway University',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Academics',
      image_url: '/Unityverse Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'saibc',
      name: 'Face Recognition Workshop',
      date: '2025-12-06T13:00:00',
      start_time: '2025-12-06T13:00:00',
      end_time: '2025-12-06T15:00:00',
      venue: 'UW-2-6, Sunway University',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Academics',
      image_url: '/Face Recognition Workshop Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'saibc',
      name: 'Building AI Automation Skills - Learn to Build Real AI Systems',
      date: '2026-02-10T19:30:00',
      start_time: '2026-02-10T19:30:00',
      end_time: '2026-02-10T21:30:00',
      venue: 'Lecture Theatre 3, Sunway University',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Academics',
      image_url: '/Building AI Automation Skills Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'sbcc',
      name: 'From Names to Networks',
      date: '2025-12-02T18:00:00',
      start_time: '2025-12-02T18:00:00',
      end_time: '2025-12-02T21:00:00',
      venue: 'iLabs, Sunway University',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Academics',
      image_url: '/From Names to Networks Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'sbcc',
      name: 'Hyperliquid: Community Meetup',
      date: '2025-08-14T19:30:00',
      start_time: '2025-08-14T19:30:00',
      end_time: '2025-08-14T22:00:00',
      venue: 'Lecture Theatre 1, Sunway University',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Social',
      image_url: '/Hyperliquid Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'csc',
      name: 'Fortinet Industry Visit',
      date: '2026-07-01T09:00:00',
      start_time: '2026-07-01T09:00:00',
      end_time: '2026-07-01T12:00:00',
      venue: 'Equatorial Plaza, Jalan Sultan Ismail',
      pricing: '10',
      capacity: 25,
      registration_deadline: '2026-06-28T23:59:00',
      category: 'Academics',
      image_url: '/Fortinet Industry Visit Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'csc',
      name: 'Cybersecurity in the Age of AI',
      date: '2026-06-19T17:00:00',
      start_time: '2026-06-19T17:00:00',
      end_time: '2026-06-19T19:00:00',
      venue: 'TBA',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Academics',
      image_url: '/Cybersecurity Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'csc',
      name: 'SunCTF 2026',
      description: "🚨 The flags are hidden. The challenge awaits. Are you ready? 🚨\n\nSunCTF 2026 is back, bigger and better than ever. 🚩\n\nStep into a cybersecurity battle of competence, strategy, and teamwork. Track down secret flags, outplay the competition, and climb the leaderboard alongside the sharpest minds in Malaysia. Prize pool? Over RM20,000. 🏆👑",
      date: '2026-09-06T08:00:00',
      start_time: '2026-09-06T08:00:00',
      end_time: '2026-09-06T17:00:00',
      venue: 'Sir Jeffrey Cheah Hall, Level 4, Sunway College',
      pricing: '40',
      capacity: null,
      registration_deadline: null,
      category: 'Academics',
      image_url: '/SunCTF Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'sms',
      name: 'Open Mic',
      date: '2026-06-10T19:00:00',
      start_time: '2026-06-10T19:00:00',
      end_time: '2026-06-10T21:00:00',
      venue: 'JC1, Sunway University',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Entertainment',
      image_url: '/Open Mic Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'sms',
      name: 'Jam Session',
      date: '2026-03-25T19:30:00',
      start_time: '2026-03-25T19:30:00',
      end_time: '2026-03-25T21:30:00',
      venue: 'UC-8-10, Sunway University',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Entertainment',
      image_url: '/Jam Session Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'sacc',
      name: 'Tile & Style',
      date: '2026-07-02T18:00:00',
      start_time: '2026-07-02T18:00:00',
      end_time: '2026-07-02T20:00:00',
      venue: 'NC-2-29, Sunway College',
      pricing: '12',
      capacity: null,
      registration_deadline: null,
      category: 'Arts',
      image_url: '/Tile & Style Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'sacc',
      name: 'Moru Doll Companion Workshop',
      date: '2026-05-22T18:00:00',
      start_time: '2026-05-22T18:00:00',
      end_time: '2026-05-22T20:00:00',
      venue: 'NW-TR1-9A, Sunway College',
      pricing: '20',
      capacity: null,
      registration_deadline: null,
      category: 'Arts',
      image_url: '/Moru Doll Companion Workshop.jpg',
      cancelled: false,
    },
    {
      organizer: 'sacc',
      name: 'Lettercraft Workshop',
      description: 'Your name, your style, your creation 💖✨\nJoin us for a fun Lettercraft Workshop and turn your initials into a cute handmade keychain! 🧸🔑',
      date: '2026-07-24T10:00:00',
      start_time: '2026-07-24T10:00:00',
      end_time: '2026-07-24T16:00:00',
      venue: 'Booth 1, College Linked Bridge',
      pricing: '7',
      capacity: null,
      registration_deadline: null,
      category: 'Arts',
      image_url: '/Lettercraft Workshop Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'stc',
      name: 'From Data to Decisions: How AI Agents Are Reshaping Industries',
      date: '2026-05-15T18:00:00',
      start_time: '2026-05-15T18:00:00',
      end_time: '2026-05-15T20:00:00',
      venue: 'Lecture Theatre 1, Sunway University',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Academics',
      image_url: '/From Data to Decisions Poster.jpg',
      cancelled: false,
    },
    {
      organizer: 'stc',
      name: 'Autopilot Asia Hackathon',
      date: '2026-08-08T09:00:00',
      start_time: '2026-08-08T09:00:00',
      end_time: '2026-08-08T18:00:00',
      venue: 'Asia Pacific University, Kuala Lumpur',
      pricing: '0',
      capacity: null,
      registration_deadline: '2026-07-09T23:59:00',
      category: 'Academics',
      image_url: '/Autopilot Asia Hackathon Poster.jpg',
      cancelled: false,
    },
    // UAT filler - one upcoming event per remaining seeded organizer, spread across every category and a mix of free/paid 
    {
      organizer: 'scc',
      name: 'SCC Test Event',
      description: 'A test event for UAT. Covers the Cultural category with free admission.',
      date: '2026-09-02T18:00:00',
      start_time: '2026-09-02T18:00:00',
      end_time: '2026-09-02T20:00:00',
      venue: 'Sir Jeffrey Cheah Hall, Sunway College',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Cultural',
      image_url: '/test-event-scc.svg',
      cancelled: false,
    },
    {
      organizer: 'susc',
      name: 'SUSC Test Event',
      description: 'A test event for UAT. Covers the Entertainment category with paid admission.',
      date: '2026-09-05T19:00:00',
      start_time: '2026-09-05T19:00:00',
      end_time: '2026-09-05T21:30:00',
      venue: 'Rooftop Terrace, Sunway College',
      pricing: '15',
      capacity: null,
      registration_deadline: null,
      category: 'Entertainment',
      image_url: '/test-event-susc.svg',
      cancelled: false,
    },
    {
      organizer: 'ssc',
      name: 'SSC Test Event',
      description: 'A test event for UAT. Covers the Sports category with paid admission.',
      date: '2026-09-09T17:00:00',
      start_time: '2026-09-09T17:00:00',
      end_time: '2026-09-09T19:00:00',
      venue: 'Football Field, Sunway University',
      pricing: '5',
      capacity: null,
      registration_deadline: null,
      category: 'Sports',
      image_url: '/test-event-ssc.svg',
      cancelled: false,
    },
    {
      organizer: 'ssv',
      name: 'SSV Test Event',
      description: 'A test event for UAT. Covers the Social category with free admission.',
      date: '2026-09-10T18:00:00',
      start_time: '2026-09-10T18:00:00',
      end_time: '2026-09-10T20:00:00',
      venue: 'Art Gallery, Level 1, Sunway University',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Social',
      image_url: '/test-event-ssv.svg',
      cancelled: false,
    },
    {
      organizer: 'sgdc',
      name: 'SGDC Test Event',
      description: 'A test event for UAT. Covers the Arts category with free admission.',
      date: '2026-09-12T18:30:00',
      start_time: '2026-09-12T18:30:00',
      end_time: '2026-09-12T20:30:00',
      venue: 'iLabs, Sunway University',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Arts',
      image_url: '/test-event-sgdc.svg',
      cancelled: false,
    },
    {
      organizer: 'saibc',
      name: 'SAIBC Test Event',
      description: 'A test event for UAT. Covers the Academics category with paid admission.',
      date: '2026-09-16T19:00:00',
      start_time: '2026-09-16T19:00:00',
      end_time: '2026-09-16T21:00:00',
      venue: 'Lecture Theatre 3, Sunway University',
      pricing: '20',
      capacity: null,
      registration_deadline: null,
      category: 'Academics',
      image_url: '/test-event-saibc.svg',
      cancelled: false,
    },
    {
      organizer: 'sbcc',
      name: 'SBCC Test Event',
      description: 'A test event for UAT. Covers the Social category with free admission.',
      date: '2026-09-19T18:00:00',
      start_time: '2026-09-19T18:00:00',
      end_time: '2026-09-19T20:30:00',
      venue: 'Lecture Theatre 1, Sunway University',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Social',
      image_url: '/test-event-sbcc.svg',
      cancelled: false,
    },
    {
      organizer: 'sms',
      name: 'SMS Test Event',
      description: 'A test event for UAT. Covers the Entertainment category with paid admission.',
      date: '2026-09-23T19:30:00',
      start_time: '2026-09-23T19:30:00',
      end_time: '2026-09-23T21:30:00',
      venue: 'JC1, Sunway University',
      pricing: '10',
      capacity: null,
      registration_deadline: null,
      category: 'Entertainment',
      image_url: '/test-event-sms.svg',
      cancelled: false,
    },
    {
      organizer: 'stc',
      name: 'STC Test Event',
      description: 'A test event for UAT. Covers the Academics category with free admission.',
      date: '2026-09-26T18:00:00',
      start_time: '2026-09-26T18:00:00',
      end_time: '2026-09-26T20:00:00',
      venue: 'Lecture Theatre 6, Sunway University',
      pricing: '0',
      capacity: null,
      registration_deadline: null,
      category: 'Academics',
      image_url: '/test-event-stc.svg',
      cancelled: false,
    },
  ]

  for (const ev of allEvents) {
    const organizerId = idMap[ev.organizer]
    if (!organizerId) continue

    const eventData = {
      name: ev.name,
      description: ev.description ?? '',
      date: new Date(ev.date),
      start_time: new Date(ev.start_time),
      end_time: new Date(ev.end_time),
      venue: ev.venue,
      pricing: ev.pricing,
      category: ev.category,
      capacity: ev.capacity,
      registration_deadline: ev.registration_deadline ? new Date(ev.registration_deadline) : null,
      image_url: ev.image_url ?? null,
      organizer_id: organizerId,
      cancelled_at: ev.cancelled ? new Date(ev.date) : null,
    }

    const [existing] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.name, eventData.name), eq(events.organizer_id, organizerId)))
      .limit(1)
    // check if the event already exists, update if yes, insert if no
    if (existing) {
      await db.update(events).set(eventData).where(eq(events.id, existing.id))
    } else {
      await db.insert(events).values(eventData)
    }
  }
  console.log('Events seeded')

  // look up event ids by name for registrations/saves/feedback
  const eventNames = [
    "Sunway's Got Talent Season 7: Eternal Radiance Grand Finale",
    "Sunway's Got Talent Season 8: RE:VELATION Grand Finale",
    'Freshman Fiesta: 2.0: Golden Groves',
    'Face Recognition Workshop',
    'Building AI Automation Skills - Learn to Build Real AI Systems',
    'Gaming Law: Know Your Rights?',
    'From Data to Decisions: How AI Agents Are Reshaping Industries',
    'From Names to Networks',
    'Cybersecurity in the Age of AI',
    'Hyperliquid: Community Meetup',
    'Open Mic',
    'Jam Session',
    'Tile & Style',
    'Moru Doll Companion Workshop',
  ]
  const eventRows = await db
    .select({ id: events.id, name: events.name })
    .from(events)
    .where(inArray(events.name, eventNames))
  const eventMap: Record<string, number> = Object.fromEntries(eventRows.map(e => [e.name, e.id]))

  // registrations for collaborative filtering signal
  const groupA = [idMap['23061001'], idMap['24061002']].filter(Boolean) as number[]
  const groupB = [idMap['23061003'], idMap['22061004']].filter(Boolean) as number[]
  const groupC = idMap['23061005']
  const groupD = idMap['24061006']

  const seedRegistrations: { user_id: number; event_id: number; checked_in_at: Date | null }[] = []

  // Group A (FET - Academics/Social): differentiated by year
  groupA.forEach((uid, i) => {
    if (i === 0) {
      // FET Student 1 (Year 2): heavy Academics signal
      seedRegistrations.push({ user_id: uid, event_id: eventMap['Face Recognition Workshop'], checked_in_at: new Date('2025-12-06T12:55:00') })
      seedRegistrations.push({ user_id: uid, event_id: eventMap['Building AI Automation Skills - Learn to Build Real AI Systems'], checked_in_at: new Date('2026-02-10T19:25:00') })
      seedRegistrations.push({ user_id: uid, event_id: eventMap['Gaming Law: Know Your Rights?'], checked_in_at: null })
      seedRegistrations.push({ user_id: uid, event_id: eventMap['Cybersecurity in the Age of AI'], checked_in_at: null })
    } else {
      // FET Student 2 (Year 1): Academics + Year 1 social
      seedRegistrations.push({ user_id: uid, event_id: eventMap['Gaming Law: Know Your Rights?'], checked_in_at: new Date('2026-05-13T17:55:00') })
      seedRegistrations.push({ user_id: uid, event_id: eventMap['From Names to Networks'], checked_in_at: null })
      seedRegistrations.push({ user_id: uid, event_id: eventMap['Freshman Fiesta: 2.0: Golden Groves'], checked_in_at: null })
    }
  })

  // Group B (FASS - Arts/Entertainment): differentiated per student
  groupB.forEach((uid, i) => {
    if (i === 0) {
      // FASS Student 1 (Year 2)
      seedRegistrations.push({ user_id: uid, event_id: eventMap["Sunway's Got Talent Season 7: Eternal Radiance Grand Finale"], checked_in_at: new Date('2025-07-01T18:25:00') })
      seedRegistrations.push({ user_id: uid, event_id: eventMap['Open Mic'], checked_in_at: null })
      seedRegistrations.push({ user_id: uid, event_id: eventMap['Moru Doll Companion Workshop'], checked_in_at: null })
    } else {
      // FASS Student 2 (Year 3)
      seedRegistrations.push({ user_id: uid, event_id: eventMap["Sunway's Got Talent Season 7: Eternal Radiance Grand Finale"], checked_in_at: null })
      seedRegistrations.push({ user_id: uid, event_id: eventMap['Jam Session'], checked_in_at: new Date('2026-03-25T19:25:00') })
      seedRegistrations.push({ user_id: uid, event_id: eventMap['Tile & Style'], checked_in_at: null })
    }
  })

  // Group C (SHTM - Social/Entertainment)
  if (groupC) {
    // SHTM Student 1 (Year 2)
    seedRegistrations.push({ user_id: groupC, event_id: eventMap["Sunway's Got Talent Season 7: Eternal Radiance Grand Finale"], checked_in_at: null })
    seedRegistrations.push({ user_id: groupC, event_id: eventMap['Open Mic'], checked_in_at: new Date('2026-06-10T18:55:00') })
    seedRegistrations.push({ user_id: groupC, event_id: eventMap['Jam Session'], checked_in_at: null })
  }

  // Group D (SBS - Academics/Social)
  if (groupD) {
    // SBS Student 1 (Year 1)
    seedRegistrations.push({ user_id: groupD, event_id: eventMap['From Data to Decisions: How AI Agents Are Reshaping Industries'], checked_in_at: new Date('2026-05-15T17:55:00') })
    seedRegistrations.push({ user_id: groupD, event_id: eventMap['Gaming Law: Know Your Rights?'], checked_in_at: null })
    seedRegistrations.push({ user_id: groupD, event_id: eventMap['Freshman Fiesta: 2.0: Golden Groves'], checked_in_at: null })
  }

  // UAT: all seeded students are registered for SGT S8
  const sgtS8Id = eventMap["Sunway's Got Talent Season 8: RE:VELATION Grand Finale"]
  if (sgtS8Id) {
    const studentIds = seedUsers
      .filter(u => u.role === 'student')
      .map(u => idMap[u.sunway_id])
      .filter(Boolean) as number[]
    for (const uid of studentIds) {
      seedRegistrations.push({ user_id: uid, event_id: sgtS8Id, checked_in_at: new Date('2026-07-07T18:15:00') })
    }
  }

  for (const reg of seedRegistrations) {
    if (!reg.event_id) continue
    const [existing] = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(and(eq(registrations.user_id, reg.user_id), eq(registrations.event_id, reg.event_id)))
      .limit(1)
    if (!existing) {
      await db.insert(registrations).values(reg)
    } else if (reg.checked_in_at) {
      await db.update(registrations).set({ checked_in_at: reg.checked_in_at }).where(eq(registrations.id, existing.id))
    }
  }
  console.log('Registrations seeded')

  const seedSaves: { user_id: number; event_id: number }[] = []
  // FET students save Academics events they didn't register for
  if (groupA[0]) seedSaves.push({ user_id: groupA[0], event_id: eventMap['From Names to Networks'] })
  if (groupA[1]) seedSaves.push({ user_id: groupA[1], event_id: eventMap['From Data to Decisions: How AI Agents Are Reshaping Industries'] })
  // FASS students cross-save the Arts events the other attended
  if (groupB[0]) seedSaves.push({ user_id: groupB[0], event_id: eventMap['Tile & Style'] })
  if (groupB[1]) seedSaves.push({ user_id: groupB[1], event_id: eventMap['Moru Doll Companion Workshop'] })

  for (const save of seedSaves) {
    if (!save.event_id) continue
    const [existing] = await db
      .select({ id: saved_events.id })
      .from(saved_events)
      .where(and(eq(saved_events.user_id, save.user_id), eq(saved_events.event_id, save.event_id)))
      .limit(1)
    if (!existing) {
      await db.insert(saved_events).values(save)
    }
  }
  console.log('Saves seeded')

  // feedback seeding for SGT S8 using seeded student accounts (all groups A-D for testing AI summary)
  const fetStudent1Id = idMap['23061001'] 
  const fetStudent2Id = idMap['24061002']
  const fassStudent1Id = idMap['23061003']
  const fassStudent2Id = idMap['22061004']
  const shtmStudent1Id = idMap['23061005']
  const sbsStudent1Id = idMap['24061006'] 

  const sgtS8EventId = eventMap["Sunway's Got Talent Season 8: RE:VELATION Grand Finale"]

  const seedFeedback = [
    // SGT S8 Feedback (all student groups) - 6+ responses for strong AI summary
    {
      user_id: fetStudent1Id,
      event_id: sgtS8EventId,
      rating: 4,
      created_at: new Date('2026-07-08T18:05:00'),
      answers: {
        q_source: ['eLearn announcements', 'iMail blasting'],
        q_suggestions: 'Great event with diverse talent. The sound quality was better than last year. Only issue was the queue at entry was long.',
      },
    },
    {
      user_id: fetStudent2Id,
      event_id: sgtS8EventId,
      rating: 5,
      created_at: new Date('2026-07-08T18:10:00'),
      answers: {
        q_source: ['Campus booths', 'WhatsApp'],
        q_suggestions: 'Fantastic show! The variety of performances was impressive - singing, dancing, comedy, all top-notch. Definitely coming again next year.',
      },
    },
    {
      user_id: fassStudent1Id,
      event_id: sgtS8EventId,
      rating: 5,
      created_at: new Date('2026-07-08T18:15:00'),
      answers: {
        q_source: ['Word of mouth', 'Social media'],
        q_suggestions: 'Amazing performances from all finalists! The energy was electric. Venue was well-organized and committee were helpful.',
      },
    },
    {
      user_id: fassStudent2Id,
      event_id: sgtS8EventId,
      rating: 4,
      created_at: new Date('2026-07-08T18:20:00'),
      answers: {
        q_source: ['Physical posters'],
        q_suggestions: 'Really enjoyed the show. The production value was high. Some acts could have been shorter to keep the pace up.',
      },
    },
    {
      user_id: shtmStudent1Id,
      event_id: sgtS8EventId,
      rating: 5,
      created_at: new Date('2026-07-08T18:25:00'),
      answers: {
        q_source: ['Social media'],
        q_suggestions: 'One of the best events I attended this year! The talent showcase was incredible. Great atmosphere and community spirit.',
      },
    },
    {
      user_id: sbsStudent1Id,
      event_id: sgtS8EventId,
      rating: 4,
      created_at: new Date('2026-07-08T18:30:00'),
      answers: {
        q_source: ['Campus booths', 'iMail blasting'],
        q_suggestions: 'Enjoyed the performances. Would suggest having more interactive segments between acts to keep audience engaged.',
      },
    },
  ]

  for (const fb of seedFeedback) {
    if (!fb.user_id || !fb.event_id) continue
    const [existing] = await db
      .select({ id: feedback.id })
      .from(feedback)
      .where(and(eq(feedback.user_id, fb.user_id), eq(feedback.event_id, fb.event_id)))
      .limit(1)

    if (!existing) {
      await db.insert(feedback).values(fb)
    } else {
      await db
        .update(feedback)
        .set({ rating: fb.rating, answers: fb.answers, created_at: fb.created_at })
        .where(eq(feedback.id, existing.id))
    }
  }
  console.log('Feedback seeded')

  console.log('Seeding complete!')
  process.exit(0)
}

seed().catch(console.error)