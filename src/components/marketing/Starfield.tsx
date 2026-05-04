'use client'

import { useEffect, useRef } from 'react'
import { useMarketingTheme } from './ThemeProvider'

const STAR_COLORS: [number, number, number][] = [
  [245, 245, 255],
  [245, 245, 255],
  [245, 245, 255],
  [255, 255, 255],
  [255, 255, 255],
  [200, 220, 255],
  [210, 190, 255],
  [160, 230, 240],
]

const PULSE_COLORS: [number, number, number][] = [
  [124, 58, 237],   // accent purple
  [6, 182, 212],    // accent cyan
  [167, 139, 250],  // light purple
]

type Star = {
  x: number
  y: number
  depth: number
  r: number
  vx: number
  vy: number
  alpha: number
  phase: number
  twinkleSpeed: number
  color: [number, number, number]
  glow: boolean
  isHub: boolean
}

type Connection = {
  a: number              // star index
  b: number              // star index
  initialDist: number    // baseline; used to detect wrap-around
}

type Pulse = {
  cIdx: number
  t: number              // 0 → 1 along the edge
  speed: number          // per-frame progress
  color: [number, number, number]
}

type ShootingStar = {
  x: number
  y: number
  angle: number
  speed: number
  length: number
  alpha: number
  life: number
  dir: 'in' | 'cruise' | 'out'
}

const STAR_COUNT_DESKTOP = 280
const STAR_COUNT_MOBILE = 140  // cap on narrow viewports to spare mobile CPU
const HUB_FRACTION = 0.28
const MAX_CONNECTION_DIST = 230
const CONNECTIONS_PER_HUB = 2
const PARALLAX_MAX = 11
const PARALLAX_EASE = 0.05
const GLOBAL_DRIFT_X = 0.06     // px/frame at depth=1 — coherent "moving through space"
const GLOBAL_DRIFT_Y = 0.025

function makeStars(w: number, h: number, count: number): Star[] {
  const stars = Array.from({ length: count }, () => {
    const depth = Math.pow(Math.random(), 0.5) * 0.88 + 0.12
    const r = Math.max(0.4, depth * 2.3)
    const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      depth,
      r,
      // Per-star jitter on top of the global drift — closer stars move faster
      vx: GLOBAL_DRIFT_X * depth + (Math.random() - 0.5) * depth * 0.6,
      vy: GLOBAL_DRIFT_Y * depth + (Math.random() - 0.5) * depth * 0.4,
      alpha: 0.25 + depth * 0.6,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.004 + Math.random() * 0.012,
      color,
      glow: r > 1.6 && Math.random() < 0.55,
      isHub: false as boolean,
    }
  })

  // Promote a fraction of the closer/brighter stars to "hubs" — the only
  // stars that participate in the constellation network.
  const candidates = stars
    .map((s, i) => ({ i, score: s.depth * 0.7 + s.r * 0.3 }))
    .sort((a, b) => b.score - a.score)
  const hubCount = Math.floor(count * HUB_FRACTION)
  for (let k = 0; k < hubCount; k++) stars[candidates[k].i].isHub = true

  return stars
}

function buildConnections(stars: Star[]): Connection[] {
  const hubs: number[] = []
  for (let i = 0; i < stars.length; i++) if (stars[i].isHub) hubs.push(i)

  const seen = new Set<string>()
  const conns: Connection[] = []

  for (const i of hubs) {
    const a = stars[i]
    const dists = hubs
      .filter((j) => j !== i)
      .map((j) => {
        const b = stars[j]
        return { j, d: Math.hypot(b.x - a.x, b.y - a.y) }
      })
      .filter((x) => x.d < MAX_CONNECTION_DIST)
      .sort((x, y) => x.d - y.d)
      .slice(0, CONNECTIONS_PER_HUB)

    for (const { j, d } of dists) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (seen.has(key)) continue
      seen.add(key)
      conns.push({ a: i, b: j, initialDist: d })
    }
  }
  return conns
}

function makeShooter(w: number, h: number): ShootingStar {
  const angle = Math.PI / 6 + (Math.random() * Math.PI) / 8
  return {
    x: Math.random() * w * 0.6,
    y: Math.random() * h * 0.5,
    angle,
    speed: 9 + Math.random() * 7,
    length: 80 + Math.random() * 100,
    alpha: 0,
    life: 0,
    dir: 'in',
  }
}

export function Starfield() {
  const { theme } = useMarketingTheme()
  if (theme === 'light') return null
  return <StarfieldCanvas />
}

function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0, h = 0, dpr = 1
    let stars: Star[] = []
    let connections: Connection[] = []
    const pulses: Pulse[] = []
    let shooter: ShootingStar | null = null
    let shooterTimer = 12 + Math.random() * 8
    let pulseTimer = 0.4

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const starCount = w < 640 ? STAR_COUNT_MOBILE : STAR_COUNT_DESKTOP
      stars = makeStars(w, h, starCount)
      connections = buildConnections(stars)
      pulses.length = 0
    }

    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }

    const onMouseMove = (e: MouseEvent) => {
      if (reducedMotion) return
      target.x = -((e.clientX / w) * 2 - 1) * PARALLAX_MAX
      target.y = -((e.clientY / h) * 2 - 1) * PARALLAX_MAX
    }

    const drawNebula = () => {
      const g1 = ctx.createRadialGradient(w * 0.25, h * 0.2, 0, w * 0.25, h * 0.2, w * 0.45)
      g1.addColorStop(0, 'rgba(124,58,237,0.06)')
      g1.addColorStop(1, 'rgba(124,58,237,0)')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, w, h)

      const g2 = ctx.createRadialGradient(w * 0.78, h * 0.4, 0, w * 0.78, h * 0.4, w * 0.4)
      g2.addColorStop(0, 'rgba(6,182,212,0.045)')
      g2.addColorStop(1, 'rgba(6,182,212,0)')
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, w, h)
    }

    let last = performance.now()
    let raf: number

    const screenPos = (s: Star) => ({
      x: s.x + current.x * s.depth,
      y: s.y + current.y * s.depth,
    })

    const tick = (now: number) => {
      const dtMs = Math.min(now - last, 50)
      const dt = dtMs / 16.67
      last = now

      current.x += (target.x - current.x) * PARALLAX_EASE
      current.y += (target.y - current.y) * PARALLAX_EASE

      ctx.clearRect(0, 0, w, h)
      drawNebula()

      // ── Move stars ────────────────────────────────────────────────────────
      if (!reducedMotion) {
        for (const s of stars) {
          s.x += s.vx * dt
          s.y += s.vy * dt
          if (s.x < -4) s.x = w + 4
          else if (s.x > w + 4) s.x = -4
          if (s.y < -4) s.y = h + 4
          else if (s.y > h + 4) s.y = -4
          s.phase += s.twinkleSpeed * dt
        }
      }

      // ── Constellation lines (always visible at low alpha) ─────────────────
      ctx.lineWidth = 0.6
      ctx.shadowBlur = 0
      for (const c of connections) {
        const a = stars[c.a]
        const b = stars[c.b]
        const dist = Math.hypot(b.x - a.x, b.y - a.y)
        if (dist > c.initialDist * 1.7) continue   // wrapped — skip
        const ap = screenPos(a)
        const bp = screenPos(b)
        const fade = 1 - Math.min(1, dist / MAX_CONNECTION_DIST)  // closer = brighter
        ctx.strokeStyle = `rgba(160,180,230,${0.04 + fade * 0.05})`
        ctx.beginPath()
        ctx.moveTo(ap.x, ap.y)
        ctx.lineTo(bp.x, bp.y)
        ctx.stroke()
      }

      // ── Pulse spawning ────────────────────────────────────────────────────
      if (!reducedMotion && connections.length > 0) {
        pulseTimer -= dtMs / 1000
        if (pulseTimer <= 0 && pulses.length < 7) {
          const cIdx = Math.floor(Math.random() * connections.length)
          pulses.push({
            cIdx,
            t: 0,
            speed: 0.011 + Math.random() * 0.009,
            color: PULSE_COLORS[Math.floor(Math.random() * PULSE_COLORS.length)],
          })
          pulseTimer = 0.35 + Math.random() * 1.0
        }
      }

      // ── Render pulses (brightens their edge + glowing dot) ────────────────
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]
        p.t += p.speed * dt
        if (p.t >= 1) { pulses.splice(i, 1); continue }

        const c = connections[p.cIdx]
        const a = stars[c.a]
        const b = stars[c.b]
        const dist = Math.hypot(b.x - a.x, b.y - a.y)
        if (dist > c.initialDist * 1.7) { pulses.splice(i, 1); continue }

        const ap = screenPos(a)
        const bp = screenPos(b)
        const px = ap.x + (bp.x - ap.x) * p.t
        const py = ap.y + (bp.y - ap.y) * p.t
        const [pr, pg, pb] = p.color

        // Faint trailing line behind the pulse
        const grad = ctx.createLinearGradient(ap.x, ap.y, bp.x, bp.y)
        grad.addColorStop(0, `rgba(${pr},${pg},${pb},0)`)
        const trailStart = Math.max(0, p.t - 0.25)
        grad.addColorStop(trailStart, `rgba(${pr},${pg},${pb},0)`)
        grad.addColorStop(p.t, `rgba(${pr},${pg},${pb},0.55)`)
        grad.addColorStop(Math.min(1, p.t + 0.001), `rgba(${pr},${pg},${pb},0)`)
        grad.addColorStop(1, `rgba(${pr},${pg},${pb},0)`)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(ap.x, ap.y)
        ctx.lineTo(bp.x, bp.y)
        ctx.stroke()

        // Glowing head
        ctx.shadowColor = `rgb(${pr},${pg},${pb})`
        ctx.shadowBlur = 12
        ctx.globalAlpha = 1
        ctx.fillStyle = `rgb(${pr},${pg},${pb})`
        ctx.beginPath()
        ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // ── Regular stars pass ────────────────────────────────────────────────
      for (const s of stars) {
        if (s.glow) continue
        const twinkle = 0.6 + 0.4 * Math.sin(s.phase)
        const [r, g, b] = s.color
        const sp = screenPos(s)
        ctx.globalAlpha = s.alpha * twinkle
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // ── Glow stars pass ───────────────────────────────────────────────────
      for (const s of stars) {
        if (!s.glow) continue
        const twinkle = 0.65 + 0.35 * Math.sin(s.phase)
        const [r, g, b] = s.color
        const sp = screenPos(s)
        ctx.shadowColor = `rgba(${r},${g},${b},0.9)`
        ctx.shadowBlur = s.r * 5
        ctx.globalAlpha = s.alpha * twinkle
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0

      // ── Shooting star ─────────────────────────────────────────────────────
      if (!reducedMotion) {
        if (shooter === null) {
          shooterTimer -= dtMs / 1000
          if (shooterTimer <= 0) {
            shooter = makeShooter(w, h)
            shooterTimer = 9 + Math.random() * 12
          }
        } else {
          const s = shooter
          const fadeRate = 0.048
          if (s.dir === 'in') {
            s.alpha = Math.min(1, s.alpha + fadeRate * dt * 1.4)
            if (s.alpha >= 0.95) s.dir = 'cruise'
          } else if (s.dir === 'cruise') {
            s.life += dt * 0.055
            if (s.life >= 1) s.dir = 'out'
          } else {
            s.alpha = Math.max(0, s.alpha - fadeRate * dt)
            if (s.alpha <= 0) shooter = null
          }
          if (shooter !== null) {
            s.x += Math.cos(s.angle) * s.speed * dt
            s.y += Math.sin(s.angle) * s.speed * dt
            const tailX = s.x - Math.cos(s.angle) * s.length
            const tailY = s.y - Math.sin(s.angle) * s.length
            const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y)
            grad.addColorStop(0, 'rgba(255,255,255,0)')
            grad.addColorStop(0.6, `rgba(255,255,255,${s.alpha * 0.25})`)
            grad.addColorStop(1, `rgba(255,255,255,${s.alpha})`)
            ctx.globalAlpha = 1
            ctx.strokeStyle = grad
            ctx.lineWidth = 1.5
            ctx.shadowColor = 'rgba(200,220,255,0.8)'
            ctx.shadowBlur = 6
            ctx.beginPath()
            ctx.moveTo(tailX, tailY)
            ctx.lineTo(s.x, s.y)
            ctx.stroke()
            ctx.shadowBlur = 0
          }
        }
      }

      ctx.globalAlpha = 1
      raf = requestAnimationFrame(tick)
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
      } else {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }

    resize()
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  )
}
