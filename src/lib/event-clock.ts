export const EVENT_TIMEZONE = process.env.EVENT_TIMEZONE || 'America/Sao_Paulo'

export function eventClock(date = new Date(), timezone = EVENT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: string) => parts.find((p) => p.type === type)!.value
  const hour = Number(part('hour'))
  return { date: `${part('year')}-${part('month')}-${part('day')}`, hour,
    round: hour < 11 ? 0 : hour >= 20 ? 10 : hour - 10, timezone }
}

export function calculateScore(correctAnswers: number, totalSeconds: number): number {
  if (correctAnswers <= 0) return 0
  return Math.min(1000, correctAnswers * 150 + Math.max(0, 100 - Math.min(totalSeconds, 100)))
}

export function parseStoredDate(value: string): Date {
  return new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
}
