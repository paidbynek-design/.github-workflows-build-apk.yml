"use client"

const STORAGE_KEY = "abofahd_codes"

export type CodeRecord = {
  code: string
  createdAt: number
  used: boolean
}

const PREFIX = "SAYCO"

function randomSegment(len: number) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let out = ""
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

export function generateCode(): string {
  return `${PREFIX}-${randomSegment(4)}-${randomSegment(4)}-${randomSegment(4)}`
}

export function getCodes(): CodeRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CodeRecord[]) : []
  } catch {
    return []
  }
}

export function saveCodes(codes: CodeRecord[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(codes))
}

export function addCodes(count: number): CodeRecord[] {
  const existing = getCodes()
  const next: CodeRecord[] = [...existing]
  for (let i = 0; i < count; i++) {
    next.unshift({ code: generateCode(), createdAt: Date.now(), used: false })
  }
  saveCodes(next)
  return next
}

export function deleteCode(code: string): CodeRecord[] {
  const next = getCodes().filter((c) => c.code !== code)
  saveCodes(next)
  return next
}

export function markUsed(code: string): CodeRecord[] {
  const next = getCodes().map((c) => (c.code === code ? { ...c, used: true } : c))
  saveCodes(next)
  return next
}

export function validateCode(input: string): "valid" | "used" | "invalid" {
  const found = getCodes().find((c) => c.code === input.trim().toUpperCase())
  if (!found) return "invalid"
  if (found.used) return "used"
  return "valid"
}
