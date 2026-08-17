"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { useIsClient } from "@/hooks/use-client"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useIsClient()

  if (!mounted) {
    return (
      <button type="button" className="btn btn-square btn-ghost" aria-label="Toggle theme" />
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <button
      type="button"
      className="btn btn-square btn-ghost"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
