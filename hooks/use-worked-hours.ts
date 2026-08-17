"use client"

import { useCallback, useSyncExternalStore } from "react"

import type { HoursByDate } from "@/lib/hours"
import { HOURS_STORAGE_KEY, loadHours, saveHours } from "@/lib/storage"

const EMPTY_HOURS: HoursByDate = {}
const listeners = new Set<() => void>()

let snapshot: HoursByDate = EMPTY_HOURS
let snapshotRaw: string | null | undefined

function emit() {
  snapshotRaw = undefined
  for (const listener of listeners) {
    listener()
  }
}

function onStorage(event: StorageEvent) {
  if (event.key === HOURS_STORAGE_KEY || event.key === null) {
    emit()
  }
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.addEventListener("storage", onStorage)
  }

  listeners.add(listener)

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorage)
    }
  }
}

function getSnapshot() {
  const raw = window.localStorage.getItem(HOURS_STORAGE_KEY)

  if (raw === snapshotRaw) {
    return snapshot
  }

  snapshotRaw = raw
  snapshot = loadHours()
  return snapshot
}

function getServerSnapshot() {
  return EMPTY_HOURS
}

export function useWorkedHours() {
  const hours = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setHours = useCallback(
    (updater: HoursByDate | ((current: HoursByDate) => HoursByDate)) => {
      const current = getSnapshot()
      const next = typeof updater === "function" ? updater(current) : updater
      saveHours(next)
      emit()
    },
    []
  )

  return { hours, setHours }
}
