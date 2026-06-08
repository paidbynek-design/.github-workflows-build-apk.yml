"use client"

import { useEffect, useRef, useState } from "react"
import {
  type LibRecord,
  type ShizukuStatus,
  applyLib,
  clearLib,
  fileToBase64,
  formatBytes,
  getLib,
  getShizukuStatus,
  requestShizukuPermission,
  saveLib,
} from "@/lib/libfile"

const STATUS_LABEL: Record<ShizukuStatus, string> = {
  available: "Shizuku connected",
  permission_required: "Permission required",
  not_running: "Shizuku not running",
  unsupported: "Preview mode (no APK)",
}

const STATUS_COLOR: Record<ShizukuStatus, string> = {
  available: "text-emerald-400",
  permission_required: "text-amber-400",
  not_running: "text-red-400",
  unsupported: "text-neutral-400",
}

export function LibSection() {
  const [lib, setLib] = useState<LibRecord | null>(null)
  const [status, setStatus] = useState<ShizukuStatus>("unsupported")
  const [pkg, setPkg] = useState("")
  const [version, setVersion] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getLib().then(setLib)
    setStatus(getShizukuStatus())
    const saved = localStorage.getItem("ducky_target_pkg")
    if (saved) setPkg(saved)
  }, [])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setMsg({ ok: true, text: `Reading ${formatBytes(file.size)} — please wait…` })
    try {
      const dataBase64 = await fileToBase64(file)
      const rec = await saveLib({
        name: file.name,
        size: file.size,
        dataBase64,
        uploadedAt: Date.now(),
        version: version.trim() || new Date().toISOString().slice(0, 10),
        abi: "arm64-v8a",
      })
      setLib(rec)
      setMsg({ ok: true, text: `Loaded ${file.name}` })
    } catch {
      setMsg({ ok: false, text: "Failed to read file." })
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleApply() {
    setBusy(true)
    setMsg(null)
    localStorage.setItem("ducky_target_pkg", pkg.trim())
    if (status === "permission_required") {
      const granted = await requestShizukuPermission()
      setStatus(getShizukuStatus())
      if (!granted) {
        setMsg({ ok: false, text: "Shizuku permission denied." })
        setBusy(false)
        return
      }
    }
    const res = await applyLib(pkg)
    setMsg({ ok: res.ok, text: res.message })
    setBusy(false)
  }

  async function handleClear() {
    await clearLib()
    setLib(null)
    setMsg(null)
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-neutral-900/60 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
          Lib File
        </p>
        <span className={`text-[10px] font-semibold tracking-wider ${STATUS_COLOR[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
        Upload a <span className="font-mono text-neutral-300">.so</span> library. It is applied to
        the game&apos;s <span className="font-mono text-neutral-300">arm64-v8a</span> folder via
        Shizuku.
      </p>

      {lib ? (
        <div className="mt-4 rounded-xl border border-blue-400/20 bg-black/40 p-3">
          <p className="truncate font-mono text-sm text-white">{lib.name}</p>
          <div className="mt-1 flex items-center gap-3 text-[10px] uppercase tracking-wider text-neutral-400">
            <span>{formatBytes(lib.size)}</span>
            <span>v{lib.version}</span>
            <span>{lib.abi}</span>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-white/10 bg-black/30 py-6 text-center text-xs text-neutral-500">
          No lib file loaded.
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="Version (optional)"
          className="w-32 rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 text-xs text-white outline-none focus:border-blue-400/70"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex-1 rounded-lg border border-white/15 bg-white/5 py-2.5 text-xs font-bold tracking-wider text-white transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {lib ? "REPLACE FILE" : "UPLOAD .SO"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".so,application/octet-stream"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      <input
        type="text"
        value={pkg}
        onChange={(e) => setPkg(e.target.value)}
        placeholder="Game package e.g. com.game.name"
        className="mt-3 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-blue-400/70"
      />

      <button
        type="button"
        onClick={handleApply}
        disabled={busy || !lib}
        className="mt-3 w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-400 py-3 text-sm font-bold tracking-wider text-white shadow-[0_0_18px_rgba(56,120,255,0.5)] transition-transform active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
      >
        {busy ? "WORKING..." : "UPDATE LIB TO ARM64-V8A"}
      </button>

      {lib && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-2 w-full text-center text-[11px] font-semibold tracking-wide text-red-400/80 hover:text-red-300"
        >
          REMOVE FILE
        </button>
      )}

      {msg && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-center text-xs font-semibold ${
            msg.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  )
}
