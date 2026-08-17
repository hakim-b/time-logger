import { sanitizeHoursByDate, type HoursByDate } from "@/lib/hours"

export const HOURS_STORAGE_KEY = "time-logger:hours:v1"

export function loadHours(): HoursByDate {
  if (typeof window === "undefined") {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(HOURS_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    return sanitizeHoursByDate(JSON.parse(raw))
  } catch {
    return {}
  }
}

export function saveHours(data: HoursByDate) {
  window.localStorage.setItem(HOURS_STORAGE_KEY, JSON.stringify(data))
}
