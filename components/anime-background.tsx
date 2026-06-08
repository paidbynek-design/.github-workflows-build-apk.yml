"use client"

import { useEffect, useRef } from "react"

type Particle = {
  x: number
  y: number
  vy: number
  size: number
  alpha: number
  pulse: number
}

export function AnimeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let particles: Particle[] = []
    let raf = 0
    let t = 0

    function setup() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.max(50, Math.round((width * height) / 9000))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: -(0.15 + Math.random() * 0.5),
        size: 0.6 + Math.random() * 2.2,
        alpha: 0.2 + Math.random() * 0.6,
        pulse: Math.random() * Math.PI * 2,
      }))
    }

    function draw() {
      t += 0.02
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.y += p.vy
        p.x += Math.sin(t + p.pulse) * 0.25
        if (p.y < -5) {
          p.y = height + 5
          p.x = Math.random() * width
        }
        const a = p.alpha * (0.6 + 0.4 * Math.sin(t * 2 + p.pulse))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(120, 190, 255, ${a})`
        ctx.shadowColor = "rgba(80, 160, 255, 0.9)"
        ctx.shadowBlur = 8
        ctx.fill()
      }
      ctx.shadowBlur = 0

      raf = requestAnimationFrame(draw)
    }

    setup()
    draw()

    function onResize() {
      cancelAnimationFrame(raf)
      setup()
      draw()
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/anime-bg.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* darkening + blue tint overlays */}
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(40,110,255,0.25),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.9)_100%)]" />
      {/* floating particle effects */}
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
    </div>
  )
}
