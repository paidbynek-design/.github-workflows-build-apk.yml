"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimeBackground } from "@/components/anime-background"
import { LibSection } from "@/components/lib-section"
import {
  type CodeRecord,
  addCodes,
  deleteCode,
  getCodes,
  markUsed,
} from "@/lib/codes"

const DEV_PASSWORD = "ducky0008"

export default function DeveloperPage() {
  const [codes, setCodes] = useState<CodeRecord[]>([])
  const [amount, setAmount] = useState(1)
  const [copied, setCopied] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [pw, setPw] = useState("")
  const [pwError, setPwError] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem("ducky_dev_unlocked") === "1") {
      setUnlocked(true)
    }
  }, [])

  useEffect(() => {
    if (unlocked) setCodes(getCodes())
  }, [unlocked])

  function handleUnlock() {
    if (pw === DEV_PASSWORD) {
      sessionStorage.setItem("ducky_dev_unlocked", "1")
      setUnlocked(true)
      setPwError(false)
    } else {
      setPwError(true)
    }
  }

  function handleGenerate() {
    const n = Math.min(Math.max(amount, 1), 50)
    setCodes(addCodes(n))
  }

  function handleCopy(code: string) {
    navigator.clipboard?.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 1200)
  }

  if (!unlocked) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black">
        <div className="pointer-events-none absolute inset-0">
          <AnimeBackground />
        </div>

        <div className="relative z-10 w-full max-w-xs px-6">
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 backdrop-blur-md">
            <h1 className="text-center text-lg font-bold tracking-wider text-white drop-shadow-[0_2px_10px_rgba(60,130,255,0.7)]">
              DEVELOPER ACCESS
            </h1>
            <p className="mt-1 text-center text-xs text-neutral-400">
              Enter password to continue
            </p>

            <input
              type="password"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value)
                setPwError(false)
              }}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              placeholder="Password"
              className="mt-5 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-3 text-center text-sm font-semibold tracking-wider text-white outline-none focus:border-blue-400/70"
            />

            {pwError && (
              <p className="mt-2 text-center text-xs font-semibold text-red-400">
                Incorrect password
              </p>
            )}

            <button
              type="button"
              onClick={handleUnlock}
              className="mt-4 w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-400 py-3 text-sm font-bold tracking-wider text-white shadow-[0_0_18px_rgba(56,120,255,0.5)] transition-transform active:scale-[0.98]"
            >
              UNLOCK
            </button>

            <Link
              href="/"
              className="mt-4 block text-center text-xs font-semibold tracking-[0.2em] text-blue-300/80 hover:text-blue-200"
            >
              {"< BACK"}
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0">
        <AnimeBackground />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-1 flex-col px-6 pb-12 pt-16">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-semibold tracking-[0.2em] text-blue-300/80 hover:text-blue-200"
          >
            {"< BACK"}
          </Link>
          <h1 className="text-lg font-bold tracking-wider text-white drop-shadow-[0_2px_10px_rgba(60,130,255,0.7)]">
            DEVELOPER
          </h1>
          <span className="w-12" />
        </div>

        {/* lib file panel */}
        <LibSection />

        {/* generator panel */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-neutral-900/60 p-5 backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Generate Codes
          </p>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={50}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-20 rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 text-center text-sm font-semibold text-white outline-none focus:border-blue-400/70"
            />
            <button
              type="button"
              onClick={handleGenerate}
              className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-blue-400 py-2.5 text-sm font-bold tracking-wider text-white shadow-[0_0_18px_rgba(56,120,255,0.5)] transition-transform active:scale-[0.98]"
            >
              GENERATE
            </button>
          </div>
        </div>

        {/* list header */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Codes ({codes.length})
          </p>
          {codes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                codes.forEach((c) => deleteCode(c.code))
                setCodes([])
              }}
              className="text-xs font-semibold tracking-wide text-red-400/80 hover:text-red-300"
            >
              CLEAR ALL
            </button>
          )}
        </div>

        {/* codes list */}
        <div className="mt-3 flex flex-col gap-2">
          {codes.length === 0 && (
            <p className="py-8 text-center text-xs text-neutral-500">
              No codes yet. Generate some above.
            </p>
          )}
          {codes.map((c) => (
            <div
              key={c.code}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900/60 px-3 py-2.5 backdrop-blur-md"
            >
              <button
                type="button"
                onClick={() => handleCopy(c.code)}
                className="flex-1 text-left"
              >
                <span
                  className={`block font-mono text-sm tracking-wide ${
                    c.used ? "text-neutral-500 line-through" : "text-white"
                  }`}
                >
                  {c.code}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-blue-300/70">
                  {copied === c.code ? "Copied!" : c.used ? "Used" : "Tap to copy"}
                </span>
              </button>
              {!c.used && (
                <button
                  type="button"
                  onClick={() => setCodes(markUsed(c.code))}
                  className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-semibold tracking-wide text-neutral-200 hover:bg-white/20"
                >
                  USE
                </button>
              )}
              <button
                type="button"
                onClick={() => setCodes(deleteCode(c.code))}
                className="rounded-md bg-red-500/15 px-2 py-1 text-[10px] font-semibold tracking-wide text-red-300 hover:bg-red-500/25"
              >
                DEL
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
