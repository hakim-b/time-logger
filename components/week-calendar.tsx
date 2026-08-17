"use client"

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react"

import { ThemeToggle } from "@/components/theme-toggle"
import { useClientNow } from "@/hooks/use-client"
import { useWorkedHours } from "@/hooks/use-worked-hours"
import { exportWeekToExcel } from "@/lib/export-week"
import {
  applyHour,
  clearDates,
  dayTotal,
  formatBlock,
  formatHour,
  hoursToBlocks,
  weekTotal,
} from "@/lib/hours"
import { cn } from "@/lib/utils"
import {
  WEEKDAY_SHORT,
  addDays,
  formatWeekRange,
  getWeekDays,
  isSameDay,
  startOfWeek,
  toISODate,
} from "@/lib/week"

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

type PaintMode = "add" | "remove"

export function WeekCalendar() {
  const { hours, setHours } = useWorkedHours()
  const now = useClientNow()
  const [weekStart, setWeekStart] = useState<Date | null>(null)
  const [exportedName, setExportedName] = useState<string | null>(null)
  const paintMode = useRef<PaintMode | null>(null)
  const lastPainted = useRef<string | null>(null)
  const clearDialog = useRef<HTMLDialogElement>(null)
  const exportTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (exportTimer.current !== null) {
        window.clearTimeout(exportTimer.current)
      }
    }
  }, [])

  const displayedWeek = weekStart ?? (now ? startOfWeek(now) : null)
  const days = useMemo(
    () => (displayedWeek ? getWeekDays(displayedWeek) : []),
    [displayedWeek]
  )
  const dates = useMemo(() => days.map(toISODate), [days])
  const totalHours = weekTotal(hours, dates)
  const daysWorked = dates.filter((date) => dayTotal(hours, date) > 0).length
  const isCurrentWeek = Boolean(
    displayedWeek && now && isSameDay(displayedWeek, startOfWeek(now))
  )

  function paintCell(date: string, hour: number, mode: PaintMode) {
    const key = `${date}:${hour}`
    if (lastPainted.current === `${mode}:${key}`) {
      return
    }

    lastPainted.current = `${mode}:${key}`
    setHours((current) => applyHour(current, date, hour, mode))
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-date][data-hour]")
    if (!cell?.dataset.date || cell.dataset.hour === undefined) {
      return
    }

    const date = cell.dataset.date
    const hour = Number(cell.dataset.hour)
    const mode: PaintMode = hours[date]?.includes(hour) ? "remove" : "add"

    paintMode.current = mode
    lastPainted.current = null
    paintCell(date, hour, mode)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!paintMode.current) {
      return
    }

    const target = document.elementFromPoint(event.clientX, event.clientY)
    const cell = target?.closest<HTMLElement>("[data-date][data-hour]")
    if (!cell?.dataset.date || cell.dataset.hour === undefined) {
      return
    }

    paintCell(cell.dataset.date, Number(cell.dataset.hour), paintMode.current)
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    paintMode.current = null
    lastPainted.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  async function handleExport() {
    if (!displayedWeek) {
      return
    }

    const filename = await exportWeekToExcel(displayedWeek, hours)
    setExportedName(filename)
    if (exportTimer.current !== null) {
      window.clearTimeout(exportTimer.current)
    }
    exportTimer.current = window.setTimeout(() => {
      setExportedName(null)
    }, 2500)
  }

  function handleClearWeek() {
    setHours((current) => clearDates(current, dates))
  }

  if (!displayedWeek || !now) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <span className="loading loading-spinner loading-lg" aria-label="Loading calendar" />
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-base-200">
      <div className="navbar bg-base-200 px-4 sm:px-6">
        <div className="navbar-start gap-2">
          <CalendarDays className="size-5" />
          <span className="text-lg font-semibold">Time Logger</span>
        </div>
        <div className="navbar-center hidden md:flex">
          <WeekSwitcher
            label={formatWeekRange(displayedWeek)}
            onPrevious={() => setWeekStart(addDays(displayedWeek, -7))}
            onNext={() => setWeekStart(addDays(displayedWeek, 7))}
          />
        </div>
        <div className="navbar-end gap-2">
          <button
            type="button"
            className="btn hidden sm:inline-flex"
            disabled={isCurrentWeek}
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            Today
          </button>
          <button type="button" className="btn btn-primary" onClick={handleExport}>
            <Download className="size-4" />
            {exportedName ? "Downloaded" : "Export Excel"}
          </button>
          <ThemeToggle />
        </div>
      </div>

      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-8 sm:px-6">
        <div className="flex justify-center md:hidden">
          <WeekSwitcher
            label={formatWeekRange(displayedWeek)}
            onPrevious={() => setWeekStart(addDays(displayedWeek, -7))}
            onNext={() => setWeekStart(addDays(displayedWeek, 7))}
          />
        </div>

        <div className="stats stats-vertical w-full bg-base-100 shadow sm:stats-horizontal">
          <div className="stat">
            <div className="stat-title">Hours this week</div>
            <div className="stat-value">{totalHours}</div>
            <div className="stat-desc">
              {isCurrentWeek ? "Current week" : "Viewing another week"}
            </div>
          </div>
          <div className="stat">
            <div className="stat-title">Days logged</div>
            <div className="stat-value">{daysWorked}</div>
            <div className="stat-desc">of 7 days</div>
          </div>
          <div className="stat">
            <div className="stat-title">Daily average</div>
            <div className="stat-value">
              {daysWorked === 0 ? "0" : (totalHours / daysWorked).toFixed(1)}
            </div>
            <div className="stat-desc">hours on days you worked</div>
          </div>
        </div>

        <section className="card bg-base-100 shadow">
          <div className="card-body gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="card-title">Weekly calendar</h2>
                <p className="text-sm text-base-content/70">
                  Click or drag across hours to mark time you worked. Hours are saved in this
                  browser.
                </p>
              </div>
              <button
                type="button"
                className="btn"
                disabled={totalHours === 0}
                onClick={() => clearDialog.current?.showModal()}
              >
                <Trash2 className="size-4" />
                Clear week
              </button>
            </div>

            <div
              className="touch-none max-h-[min(70vh,44rem)] overflow-auto select-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div
                className="grid min-w-208 gap-px"
                style={{
                  gridTemplateColumns: "4.5rem repeat(7, minmax(0, 1fr))",
                }}
              >
                <div className="sticky top-0 left-0 z-30 bg-base-100" />
                {days.map((day, index) => {
                  const iso = dates[index]
                  const today = isSameDay(day, now)
                  const logged = dayTotal(hours, iso)

                  return (
                    <div
                      key={iso}
                      className={cn(
                        "sticky top-0 z-20 flex flex-col items-center gap-1 rounded-t-box bg-base-100 py-2",
                        today && "bg-base-200"
                      )}
                    >
                      <span className="text-xs font-medium uppercase tracking-wide text-base-content/60">
                        {WEEKDAY_SHORT[index]}
                      </span>
                      {today ? (
                        <span className="badge">{day.getDate()}</span>
                      ) : (
                        <span className="text-lg font-semibold">{day.getDate()}</span>
                      )}
                      <span className="text-xs text-base-content/60">{logged}h</span>
                    </div>
                  )
                })}

                {HOURS.map((hour) => (
                  <HourRow
                    key={hour}
                    hour={hour}
                    dates={dates}
                    days={days}
                    now={now}
                    hours={hours}
                  />
                ))}
              </div>
            </div>

            <WeekSummary dates={dates} hours={hours} />
          </div>
        </section>
      </main>

      <dialog ref={clearDialog} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Clear this week?</h3>
          <p className="py-4">
            This removes the highlighted hours for {formatWeekRange(displayedWeek)}. Other weeks stay
            as they are.
          </p>
          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button type="submit" className="btn">
                Cancel
              </button>
              <button type="submit" className="btn btn-error" onClick={handleClearWeek}>
                Clear week
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit">close</button>
        </form>
      </dialog>
    </div>
  )
}

function WeekSwitcher({
  label,
  onPrevious,
  onNext,
}: {
  label: string
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="join">
      <button
        type="button"
        className="btn join-item"
        aria-label="Previous week"
        onClick={onPrevious}
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="btn join-item pointer-events-none min-w-52 font-medium">{label}</span>
      <button type="button" className="btn join-item" aria-label="Next week" onClick={onNext}>
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}

function HourRow({
  hour,
  dates,
  days,
  now,
  hours,
}: {
  hour: number
  dates: string[]
  days: Date[]
  now: Date
  hours: ReturnType<typeof useWorkedHours>["hours"]
}) {
  return (
    <>
      <div className="sticky left-0 z-10 flex h-7 items-center justify-end bg-base-100 pr-2 text-xs text-base-content/60">
        {formatHour(hour)}
      </div>
      {dates.map((date, index) => {
        const worked = hours[date]?.includes(hour) ?? false
        const today = isSameDay(days[index], now)
        const currentHour = today && now.getHours() === hour

        return (
          <button
            key={`${date}-${hour}`}
            type="button"
            data-date={date}
            data-hour={hour}
            aria-pressed={worked}
            aria-label={`${days[index].toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}, ${formatHour(hour)} to ${formatHour(hour + 1)}${worked ? ", worked" : ""}`}
            className={cn(
              "h-7 w-full rounded-sm border border-base-300",
              worked
                ? "bg-success text-success-content"
                : today
                  ? "bg-base-200 hover:bg-base-300"
                  : "bg-base-100 hover:bg-base-300",
              currentHour && "ring-info ring-1 ring-inset"
            )}
          />
        )
      })}
    </>
  )
}

function WeekSummary({
  dates,
  hours,
}: {
  dates: string[]
  hours: ReturnType<typeof useWorkedHours>["hours"]
}) {
  const rows = dates
    .map((date, index) => {
      const blocks = hoursToBlocks(hours[date] ?? [])
      if (blocks.length === 0) {
        return null
      }

      return {
        date,
        day: WEEKDAY_SHORT[index],
        blocks: blocks.map(formatBlock).join(", "),
        total: hours[date]?.length ?? 0,
      }
    })
    .filter((row) => row !== null)

  if (rows.length === 0) {
    return (
      <div role="alert" className="alert">
        <span>No hours marked this week yet. Drag across the grid to start logging.</span>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Day</th>
            <th>Blocks</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date}>
              <td>
                {row.day} {row.date.slice(8)}
              </td>
              <td>{row.blocks}</td>
              <td>{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
