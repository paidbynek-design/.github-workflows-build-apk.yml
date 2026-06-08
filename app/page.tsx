"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimeBackground } from "@/components/anime-background"
import { validateCode } from "@/lib/codes"

export default function Page() {
  const [code, setCode] = useState("")
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; msg: string }>(null)

  function handleInject() {
    if (!code.trim()) {
      setStatus({ kind: "err", msg: "Enter a license code" })
      return
    }
    const result = validateCode(code)
    if (result === "valid") {
      setStatus({ kind: "ok", msg: "Injection successful • Access granted" })
    } else if (result === "used") {
      setStatus({ kind: "err", msg: "Code already used" })
    } else {
      setStatus({ kind: "err", msg: "Invalid license code" })
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0">
        <AnimeBackground />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-1 flex-col items-center px-6 pt-28">
        <h1 className="text-balance text-4xl font-bold tracking-wide text-white drop-shadow-[0_2px_12px_rgba(60,130,255,0.7)]">
          DUCKY
        </h1>

        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            setStatus(null)
          }}
          placeholder="ENTER LICENSE CODE"
          className="mt-10 w-full rounded-full border border-white/15 bg-neutral-900/70 px-6 py-3.5 text-center text-sm font-semibold tracking-wider text-white placeholder:text-neutral-500 shadow-lg backdrop-blur-md outline-none focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/40"
        />

        <button
          type="button"
          onClick={handleInject}
          className="mt-5 w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-400 py-3.5 text-sm font-bold tracking-wider text-white shadow-[0_0_24px_rgba(56,120,255,0.55)] transition-transform active:scale-[0.98]"
        >
          INJECTION
        </button>

        {status && (
          <p
            className={`mt-4 text-center text-xs font-semibold tracking-wide ${
              status.kind === "ok" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {status.msg}
          </p>
        )}

        <Link
          href="/developer"
          className="mt-auto mb-12 text-xs font-semibold tracking-[0.25em] text-blue-300/80 transition-colors hover:text-blue-200"
        >
          DEVELOPER
        </Link>
      </div>
    </main>
  )
}
