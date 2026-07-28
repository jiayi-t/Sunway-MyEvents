// Timezone helpers pinned to Malaysia time

const MYT = 'Asia/Kuala_Lumpur'

// An instant reduced to its MYT calendar day, as YYYY-MM-DD
export function toMYT(raw: string | number | Date): string {
  // 'en-CA' formats as YYYY-MM-DD
  return new Date(raw).toLocaleDateString('en-CA', { timeZone: MYT })
}

// Today's date in MYT, as YYYY-MM-DD
export function todayMYT(): string {
  return toMYT(Date.now())
}

// Yesterday's date in MYT, as YYYY-MM-DD
export function yesterdayMYT(): string {
  return toMYT(Date.now() - 86_400_000)
}

// MYT wall-clock date (+ optional HH:MM or HH:MM:SS) as an instant the server cannot misread
export function fromMYT(day: string, time = '00:00:00'): string {
  const withSeconds = time.length === 5 ? `${time}:00` : time
  return `${day}T${withSeconds}+08:00`
}
