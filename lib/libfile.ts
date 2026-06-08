// Lib file management + native Shizuku bridge contract.
//
// IMPORTANT: copying a .so file into another app's
// /data/app/<game>/lib/arm64-v8a/ folder is a privileged native operation.
// A web/WebView app CANNOT do this directly. When this app is wrapped into an
// APK, a Kotlin/Java Shizuku plugin must expose a JS interface named
// `ShizukuBridge` on `window` implementing the methods below. This file calls
// that bridge if present, and otherwise runs in "preview" mode so the UI works.
//
// Storage: IndexedDB is used instead of localStorage to support large files
// (localStorage is capped at ~5 MB; IndexedDB handles hundreds of MB).

export type LibRecord = {
  name: string
  size: number
  dataBase64: string
  uploadedAt: number
  version: string
  abi: "arm64-v8a"
}

export type ShizukuStatus = "available" | "permission_required" | "not_running" | "unsupported"

type NativeBridge = {
  shizukuStatus: () => string
  requestPermission: () => Promise<boolean> | boolean
  applyLib: (targetPackage: string, fileName: string, dataBase64: string) => Promise<string> | string
}

function bridge(): NativeBridge | null {
  if (typeof window === "undefined") return null
  // @ts-expect-error injected by the native Android wrapper
  return (window.ShizukuBridge as NativeBridge) ?? null
}

export function isNativeAvailable(): boolean {
  return bridge() !== null
}

export function getShizukuStatus(): ShizukuStatus {
  const b = bridge()
  if (!b) return "unsupported"
  try {
    return b.shizukuStatus() as ShizukuStatus
  } catch {
    return "not_running"
  }
}

export async function requestShizukuPermission(): Promise<boolean> {
  const b = bridge()
  if (!b) return false
  return await b.requestPermission()
}

// ── IndexedDB helpers ──────────────────────────────────────────────────────

const DB_NAME = "ducky_db"
const STORE_NAME = "lib_store"
const RECORD_KEY = "current"

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getLib(): Promise<LibRecord | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const req = tx.objectStore(STORE_NAME).get(RECORD_KEY)
      req.onsuccess = () => resolve((req.result as LibRecord) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function saveLib(rec: LibRecord): Promise<LibRecord> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const req = tx.objectStore(STORE_NAME).put(rec, RECORD_KEY)
    req.onsuccess = () => resolve(rec)
    req.onerror = () => reject(req.error)
  })
}

export async function clearLib(): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const req = tx.objectStore(STORE_NAME).delete(RECORD_KEY)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    return
  }
}

// ── File helpers ───────────────────────────────────────────────────────────

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.includes(",") ? result.split(",")[1] : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export type ApplyResult = { ok: boolean; message: string }

export async function applyLib(targetPackage: string): Promise<ApplyResult> {
  const lib = await getLib()
  if (!lib) return { ok: false, message: "No lib file uploaded yet." }
  if (!targetPackage.trim()) return { ok: false, message: "Enter the game package name." }

  const b = bridge()
  if (!b) {
    return {
      ok: false,
      message: "Native Shizuku bridge not found. Run inside the APK build to apply.",
    }
  }

  const status = getShizukuStatus()
  if (status !== "available") {
    return { ok: false, message: `Shizuku is ${status.replace("_", " ")}.` }
  }

  try {
    const raw = await b.applyLib(targetPackage.trim(), lib.name, lib.dataBase64)
    return JSON.parse(raw) as ApplyResult
  } catch (e) {
    return { ok: false, message: `Apply failed: ${(e as Error).message}` }
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
