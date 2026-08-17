import {
  formatBlock,
  formatHour,
  hoursToBlocks,
  weekTotal,
  type HoursByDate,
} from "@/lib/hours"
import {
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  formatWeekRange,
  getISOWeek,
  getWeekDays,
  toISODate,
} from "@/lib/week"

export async function exportWeekToExcel(weekStart: Date, hours: HoursByDate) {
  const XLSX = await import("xlsx")
  const days = getWeekDays(weekStart)
  const dates = days.map(toISODate)
  const total = weekTotal(hours, dates)
  const rangeLabel = formatWeekRange(weekStart)

  const timesheetRows: (string | number)[][] = [
    ["Timesheet", rangeLabel],
    [],
    ["Date", "Day", "Start", "End", "Hours"],
  ]

  for (const [index, date] of dates.entries()) {
    const blocks = hoursToBlocks(hours[date] ?? [])

    for (const block of blocks) {
      timesheetRows.push([
        date,
        WEEKDAY_NAMES[index],
        formatHour(block.start),
        formatHour(block.end),
        block.end - block.start,
      ])
    }
  }

  timesheetRows.push([])
  timesheetRows.push(["", "", "", "Total hours", total])

  const dailyRows: (string | number)[][] = [
    ["Date", "Day", "Hours", "Time blocks"],
    ...dates.map((date, index) => {
      const blocks = hoursToBlocks(hours[date] ?? [])
      return [
        date,
        WEEKDAY_NAMES[index],
        hours[date]?.length ?? 0,
        blocks.map(formatBlock).join(", "),
      ]
    }),
    ["", "Total", total, ""],
  ]

  const gridRows: (string | number)[][] = [
    [
      "Hour",
      ...WEEKDAY_SHORT.map(
        (name, index) => `${name} ${days[index].getDate()}`
      ),
    ],
    ...Array.from({ length: 24 }, (_, hour) => [
      `${formatHour(hour)}–${formatHour(hour + 1)}`,
      ...dates.map((date) => (hours[date]?.includes(hour) ? 1 : "")),
    ]),
    ["Hours", ...dates.map((date) => hours[date]?.length ?? 0)],
  ]

  const workbook = XLSX.utils.book_new()
  const timesheet = XLSX.utils.aoa_to_sheet(timesheetRows)
  const daily = XLSX.utils.aoa_to_sheet(dailyRows)
  const grid = XLSX.utils.aoa_to_sheet(gridRows)

  timesheet["!cols"] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 10 },
    { wch: 12 },
  ]
  daily["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 40 }]
  grid["!cols"] = [{ wch: 14 }, ...dates.map(() => ({ wch: 10 }))]

  XLSX.utils.book_append_sheet(workbook, timesheet, "Timesheet")
  XLSX.utils.book_append_sheet(workbook, daily, "Daily totals")
  XLSX.utils.book_append_sheet(workbook, grid, "Hour grid")

  const { year, week } = getISOWeek(weekStart)
  const filename = `timesheet-${year}-W${String(week).padStart(2, "0")}.xlsx`
  XLSX.writeFile(workbook, filename)
  return filename
}
