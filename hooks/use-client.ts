"use client"

import { useSyncExternalStore } from "react"

function subscribe() {
  return () => {}
}

export function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false)
}

let clientNow: Date | null = null

function getClientNow() {
  if (!clientNow) {
    clientNow = new Date()
  }

  return clientNow
}

export function useClientNow() {
  return useSyncExternalStore(subscribe, getClientNow, () => null)
}
