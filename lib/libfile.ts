// Lib file management + native Shizuku bridge contract.
//
// IMPORTANT: copying a .so file into another app's
// /data/app/<game>/lib/arm64-v8a/ folder is a privileged native operation.
// A web/WebView app CANNOT do this directly. When this app is wrapped into an
// APK, a Kotlin/Java Shizuku plugin must expose a JS interface named
// `ShizukuBridge` on `window` implementing the methods below. This file calls
// that bridge if present, and otherwise runs in "preview" mode so the UI works.

export type LibRecord = {
  name: string
  size: number
  // base64 of the .so contents, stored on-device so the native layer can read it
  dataBase64: string
  uploadedAt: number
  version: string
  // arm64-v8a is the target ABI folder
  abi: "arm64-v8a"
}

const KEY = "ducky_libfile"

export type ShizukuStatus = "available" | "permission_required" | "not_running" | "unsupported"

// Shape of the native bridge the APK should inject on window.
type NativeBridge = {
  // returns one of ShizukuStatus
  shizukuStatus: () => string
  // request Shizuku permission, resolves to boolean granted
  requestPermission: () => Promise<boolean> | boolean
  // copy the stored lib (base64) into the game's arm64-v8a folder.
  // returns a JSON string: { ok: boolean, message: string }
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

export function getLib(): LibRecord | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LibRecord) : null
  } catch {
    return null
  }
}

export function saveLib(rec: LibRecord): LibRecord {
  localStorage.setItem(KEY, JSON.stringify(rec))
  return rec
}

export function clearLib(): void {
  localStorage.removeItem(KEY)
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // strip the data: prefix
      resolve(result.includes(",") ? result.split(",")[1] : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export type ApplyResult = { ok: boolean; message: string }

// Applies the stored lib to the game's arm64-v8a folder through Shizuku.
export async function applyLib(targetPackage: string): Promise<ApplyResult> {
  const lib = getLib()
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
    const parsed = JSON.parse(raw) as ApplyResult
    return parsed
  } catch (e) {
    return { ok: false, message: `Apply failed: ${(e as Error).message}` }
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
