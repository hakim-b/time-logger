export type HoursByDate = Record<string, number[]>

export type HourBlock = {
  start: number
  end: number
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

export function formatHour(hour: number): string {
  if (hour === 24) {
    return "24:00"
  }

  return `${String(hour).padStart(2, "0")}:00`
}

export function formatBlock(block: HourBlock): string {
  return `${formatHour(block.start)}–${formatHour(block.end)}`
}

export function hoursToBlocks(hours: number[]): HourBlock[] {
  const sorted = [...new Set(hours)]
    .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23)
    .sort((left, right) => left - right)

  if (sorted.length === 0) {
    return []
  }

  const blocks: HourBlock[] = []
  let start = sorted[0]
  let previous = sorted[0]

  for (let index = 1; index < sorted.length; index += 1) {
    const hour = sorted[index]
    if (hour === previous + 1) {
      previous = hour
      continue
    }

    blocks.push({ start, end: previous + 1 })
    start = hour
    previous = hour
  }

  blocks.push({ start, end: previous + 1 })
  return blocks
}

export function sanitizeHoursByDate(value: unknown): HoursByDate {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {}
  }

  const result: HoursByDate = {}

  for (const [date, hours] of Object.entries(value)) {
    if (!DATE_KEY.test(date) || !Array.isArray(hours)) {
      continue
    }

    const cleaned = hours.filter(
      (hour): hour is number => Number.isInteger(hour) && hour >= 0 && hour <= 23
    )

    if (cleaned.length === 0) {
      continue
    }

    result[date] = [...new Set(cleaned)].sort((left, right) => left - right)
  }

  return result
}

export function hasHour(data: HoursByDate, date: string, hour: number): boolean {
  return data[date]?.includes(hour) ?? false
}

export function applyHour(
  data: HoursByDate,
  date: string,
  hour: number,
  mode: "add" | "remove"
): HoursByDate {
  const nextHours = new Set(data[date] ?? [])

  if (mode === "add") {
    nextHours.add(hour)
  } else {
    nextHours.delete(hour)
  }

  const next = { ...data }

  if (nextHours.size === 0) {
    delete next[date]
  } else {
    next[date] = [...nextHours].sort((left, right) => left - right)
  }

  return next
}

export function clearDates(data: HoursByDate, dates: string[]): HoursByDate {
  const next = { ...data }

  for (const date of dates) {
    delete next[date]
  }

  return next
}

export function dayTotal(data: HoursByDate, date: string): number {
  return data[date]?.length ?? 0
}

export function weekTotal(data: HoursByDate, dates: string[]): number {
  return dates.reduce((sum, date) => sum + dayTotal(data, date), 0)
}
