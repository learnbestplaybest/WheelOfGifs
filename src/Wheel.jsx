import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import { NO_WIN_COLOR } from './constants'

const NUM_PEGS = 20
const PEG_STEP = (Math.PI * 2) / NUM_PEGS

// Pointer spring physics
const POINTER_STIFFNESS = 0.32
const POINTER_DAMPING = 0.78
const POINTER_MAX_DEG = 22
const POINTER_KICK_DEG = 16

function lighten(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `rgb(${r},${g},${b})`
}

function getSegments(gifts, noWinRemaining) {
  const segs = []
  for (const g of gifts) {
    if (g.remaining > 0) {
      segs.push({ label: g.name, count: g.remaining, color: g.color, isNoWin: false })
    }
  }
  if (noWinRemaining > 0) {
    segs.push({ label: 'Khong trung', count: noWinRemaining, color: NO_WIN_COLOR, isNoWin: true })
  }
  return segs
}

// Segments using animated/displayed counts (floats) — used for smooth resize transitions
function getDisplayedSegments(gifts, displayedCounts, displayedNoWin) {
  const segs = []
  for (let i = 0; i < gifts.length; i++) {
    const c = displayedCounts[i] ?? 0
    if (c > 0.001) {
      segs.push({ label: gifts[i].name, count: c, color: gifts[i].color, isNoWin: false })
    }
  }
  if (displayedNoWin > 0.001) {
    segs.push({ label: 'Khong trung', count: displayedNoWin, color: NO_WIN_COLOR, isNoWin: true })
  }
  return segs
}

let audioCtx = null
function playTick(volume) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = 500 + Math.random() * 500
    gain.gain.value = Math.min(0.06, volume)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.03)
  } catch {}
}

const Wheel = forwardRef(function Wheel({ gifts, noWinRemaining, rotation, onSpinEnd, resizePaused }, ref) {
  const canvasRef = useRef(null)
  const pointerRef = useRef(null)
  const sizeRef = useRef(0)
  const animRef = useRef(null)
  const settleRef = useRef(null)
  const transitionRef = useRef(null)
  const rotationRef = useRef(rotation)

  // Pointer physics state
  const pointerState = useRef({ angle: 0, velocity: 0 })

  // Displayed segment counts — animated for smooth resize after each spin.
  // counts is parallel to gifts[]; noWin is the Khong-trung count.
  const displayedRef = useRef(null)
  if (displayedRef.current === null) {
    displayedRef.current = {
      counts: gifts.map((g) => g.remaining),
      noWin: noWinRemaining,
    }
  }

  useEffect(() => {
    rotationRef.current = rotation
  }, [rotation])

  const applyPointerTransform = useCallback((angleDeg) => {
    if (pointerRef.current) {
      pointerRef.current.style.transform = `translateX(-50%) rotate(${angleDeg}deg)`
    }
  }, [])

  const drawWheel = useCallback((rot) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = sizeRef.current
    if (!size) return

    const cx = size / 2
    const cy = size / 2
    const radius = size / 2 - 6

    ctx.clearRect(0, 0, size, size)

    const displayed = displayedRef.current
    const segments = getDisplayedSegments(gifts, displayed.counts, displayed.noWin)
    const total = segments.reduce((s, seg) => s + seg.count, 0)
    if (total === 0) return

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot)

    let startAngle = 0

    for (const seg of segments) {
      const sliceAngle = (seg.count / total) * Math.PI * 2

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius, startAngle, startAngle + sliceAngle)
      ctx.closePath()

      const grad = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius)
      grad.addColorStop(0, lighten(seg.color, 30))
      grad.addColorStop(1, seg.color)
      ctx.fillStyle = grad
      ctx.fill()

      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Text
      ctx.save()
      ctx.rotate(startAngle + sliceAngle / 2)
      const fontSize = Math.min(
        Math.round(size * 0.035),
        Math.max(Math.round(size * 0.02), sliceAngle * radius * 0.12),
      )
      ctx.font = `700 ${fontSize}px Quicksand, sans-serif`
      ctx.fillStyle = '#fff'
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 4
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      let label = seg.label
      if (label.length > 16) label = label.substring(0, 15) + '...'
      ctx.fillText(label, radius - Math.round(size * 0.04), 0)
      ctx.shadowBlur = 0
      ctx.restore()

      startAngle += sliceAngle
    }

    // Pegs on wheel edge (rotate with wheel)
    const pegR = Math.max(4, Math.round(size * 0.009))
    const pegDist = radius - pegR - 2
    for (let i = 0; i < NUM_PEGS; i++) {
      const pegAngle = (i / NUM_PEGS) * Math.PI * 2
      const px = pegDist * Math.cos(pegAngle)
      const py = pegDist * Math.sin(pegAngle)

      const pegGrad = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, pegR)
      pegGrad.addColorStop(0, '#fff')
      pegGrad.addColorStop(0.5, '#ddd')
      pegGrad.addColorStop(1, '#999')
      ctx.beginPath()
      ctx.arc(px, py, pegR, 0, Math.PI * 2)
      ctx.fillStyle = pegGrad
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 0.5
      ctx.stroke()
    }

    ctx.restore()

    // Outer ring
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,210,0,0.3)'
    ctx.lineWidth = 4
    ctx.stroke()

    // Center hub
    const hubR = Math.round(size * 0.075)
    const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubR)
    hubGrad.addColorStop(0, 'rgba(255,255,255,0.15)')
    hubGrad.addColorStop(1, 'rgba(255,255,255,0.05)')
    ctx.beginPath()
    ctx.arc(cx, cy, hubR, 0, Math.PI * 2)
    ctx.fillStyle = hubGrad
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,210,0,0.4)'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [gifts, noWinRemaining])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const padding = 30
    const maxSize = Math.min(window.innerWidth - padding, window.innerHeight - padding)
    sizeRef.current = maxSize
    const dpr = window.devicePixelRatio || 1
    canvas.width = maxSize * dpr
    canvas.height = maxSize * dpr
    canvas.style.width = maxSize + 'px'
    canvas.style.height = maxSize + 'px'
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawWheel(rotationRef.current)
  }, [drawWheel])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  // Smoothly animate displayed segment counts toward the new gift counts so
  // the wheel visibly re-proportions after each spin (not a hard snap).
  useEffect(() => {
    const targetCounts = gifts.map((g) => g.remaining)
    const targetNoWin = noWinRemaining
    const displayed = displayedRef.current

    const lengthChanged = displayed.counts.length !== targetCounts.length
    const isReset =
      lengthChanged ||
      targetCounts.some((c, i) => c > (displayed.counts[i] ?? -Infinity) + 0.01) ||
      targetNoWin > displayed.noWin + 0.01

    if (isReset) {
      if (transitionRef.current) cancelAnimationFrame(transitionRef.current)
      displayedRef.current = { counts: targetCounts.slice(), noWin: targetNoWin }
      drawWheel(rotationRef.current)
      return
    }

    const atTarget =
      targetCounts.every((c, i) => Math.abs(c - displayed.counts[i]) < 0.01) &&
      Math.abs(targetNoWin - displayed.noWin) < 0.01
    if (atTarget) {
      drawWheel(rotationRef.current)
      return
    }

    // Hold the pre-spin slice sizes while the result modal is open so the
    // winning slice stays under the pointer; resize once the user dismisses it.
    if (resizePaused) {
      drawWheel(rotationRef.current)
      return
    }

    if (transitionRef.current) cancelAnimationFrame(transitionRef.current)
    const startTime = performance.now()
    const duration = 650
    const startCounts = displayed.counts.slice()
    const startNoWin = displayed.noWin

    const tick = (time) => {
      const progress = Math.min((time - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      displayedRef.current.counts = startCounts.map(
        (c, i) => c + (targetCounts[i] - c) * eased,
      )
      displayedRef.current.noWin = startNoWin + (targetNoWin - startNoWin) * eased

      drawWheel(rotationRef.current)

      if (progress < 1) {
        transitionRef.current = requestAnimationFrame(tick)
      } else {
        displayedRef.current = { counts: targetCounts.slice(), noWin: targetNoWin }
        drawWheel(rotationRef.current)
        transitionRef.current = null
      }
    }
    transitionRef.current = requestAnimationFrame(tick)

    return () => {
      if (transitionRef.current) {
        cancelAnimationFrame(transitionRef.current)
        transitionRef.current = null
      }
    }
  }, [gifts, noWinRemaining, drawWheel, resizePaused])

  // Redraw on rotation prop changes (no segment animation)
  useEffect(() => {
    if (!transitionRef.current) drawWheel(rotationRef.current)
  }, [rotation, drawWheel])

  // Settle pointer with proper spring-damper after wheel stops
  const settlePointer = useCallback(() => {
    const ps = pointerState.current
    const accel = -POINTER_STIFFNESS * ps.angle
    ps.velocity = (ps.velocity + accel) * POINTER_DAMPING
    ps.angle += ps.velocity
    applyPointerTransform(ps.angle)

    if (Math.abs(ps.angle) > 0.05 || Math.abs(ps.velocity) > 0.05) {
      settleRef.current = requestAnimationFrame(settlePointer)
    } else {
      ps.angle = 0
      ps.velocity = 0
      applyPointerTransform(0)
    }
  }, [applyPointerTransform])

  useImperativeHandle(ref, () => ({
    spin(targetResult) {
      const segments = getSegments(gifts, noWinRemaining)
      const total = segments.reduce((s, seg) => s + seg.count, 0)
      if (total === 0) return

      // Cancel any pointer settle animation
      if (settleRef.current) cancelAnimationFrame(settleRef.current)
      pointerState.current.angle = 0
      pointerState.current.velocity = 0
      applyPointerTransform(0)

      // Cancel any in-flight segment resize and snap displayed to current gifts
      if (transitionRef.current) {
        cancelAnimationFrame(transitionRef.current)
        transitionRef.current = null
      }
      displayedRef.current = {
        counts: gifts.map((g) => g.remaining),
        noWin: noWinRemaining,
      }

      let targetIndex = -1
      if (targetResult.type === 'noWin') {
        targetIndex = segments.findIndex((s) => s.isNoWin)
      } else {
        targetIndex = segments.findIndex((s) => s.label === targetResult.gift.name && !s.isNoWin)
      }
      if (targetIndex < 0) targetIndex = 0

      let segStart = 0
      for (let i = 0; i < targetIndex; i++) {
        segStart += (segments[i].count / total) * Math.PI * 2
      }
      const wonCount = segments[targetIndex].count
      const segAngle = (wonCount / total) * Math.PI * 2

      // Land inside the "survives the deduction" portion of the won segment so
      // the pointer stays over the winning slice while it animates smaller.
      const unit = segAngle / wonCount
      const safeEnd = unit * Math.max(0, wonCount - 1)
      const margin = Math.min(segAngle * 0.15, safeEnd > 0 ? safeEnd * 0.25 : segAngle * 0.05)
      const safeRange = Math.max(0, safeEnd - 2 * margin)
      const targetInWheel = segStart + margin + Math.random() * safeRange

      const baseRotation = -Math.PI / 2 - targetInWheel
      const fullSpins = (5 + Math.random() * 4) * Math.PI * 2

      let delta = baseRotation + fullSpins - rotationRef.current
      while (delta < fullSpins * 0.8) delta += Math.PI * 2

      const startRotation = rotationRef.current
      const duration = 4500 + Math.random() * 1500
      const startTime = performance.now()

      let lastPegIndex = -1
      let prevRot = rotationRef.current
      const ps = pointerState.current

      if (animRef.current) cancelAnimationFrame(animRef.current)

      const animate = (time) => {
        const elapsed = time - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)

        const currentRot = startRotation + delta * eased
        rotationRef.current = currentRot
        drawWheel(currentRot)

        // Wheel direction (the wheel only spins forward here, but keep it generic)
        const rotDelta = currentRot - prevRot
        const wheelDir = rotDelta >= 0 ? 1 : -1
        prevRot = currentRot

        // Angle of wheel at the pointer (top): 0..2π
        const wheelAngle =
          (((-Math.PI / 2 - currentRot) % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2)
        const currentPegIndex = Math.floor(wheelAngle / PEG_STEP)
        const pegPhase = (wheelAngle / PEG_STEP) - currentPegIndex // 0..1 between pegs

        // Speed factor: derivative of ease-out cubic = 3*(1-p)^2, plus floor so end ticks feel
        const speed = 3 * Math.pow(1 - progress, 2)
        const speedFactor = Math.min(1, speed + 0.1)

        // Peg crossing: play tick + small impulse for snap
        if (currentPegIndex !== lastPegIndex && lastPegIndex !== -1) {
          ps.velocity -= wheelDir * speedFactor * 1.2 // recoil opposite to wheel direction
          playTick(0.03 + speed * 0.015)
        }
        lastPegIndex = currentPegIndex

        // Continuous engagement: as a peg slides under the tip it lifts the pointer in
        // wheel direction; the moment the peg slips past, the target drops to 0 and the
        // spring snaps the pointer back (classic sawtooth flap motion).
        // When wheelDir > 0, wheelAngle decreases, so pegPhase decreases 1→0 then snaps.
        // engagement = how far peg has lifted the pointer (0 just released, 1 about to release).
        const engagement = wheelDir > 0 ? 1 - pegPhase : pegPhase
        const engagementTarget = engagement * speedFactor * POINTER_KICK_DEG * wheelDir

        // Spring-damper toward engagement target
        const accel = -POINTER_STIFFNESS * (ps.angle - engagementTarget)
        ps.velocity = (ps.velocity + accel) * POINTER_DAMPING
        ps.angle += ps.velocity

        // Clamp so the pointer doesn't fly off on the very first fast pegs
        if (ps.angle > POINTER_MAX_DEG) {
          ps.angle = POINTER_MAX_DEG
          if (ps.velocity > 0) ps.velocity = 0
        } else if (ps.angle < -POINTER_MAX_DEG) {
          ps.angle = -POINTER_MAX_DEG
          if (ps.velocity < 0) ps.velocity = 0
        }

        applyPointerTransform(ps.angle)

        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate)
        } else {
          // Wheel done — derive result from the actual visual position so modal
          // always matches what the pointer is pointing at.
          const finalLocalAngle =
            ((-Math.PI / 2 - currentRot) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2)
          const finalSegs = getSegments(gifts, noWinRemaining)
          const finalTotal = finalSegs.reduce((s, seg) => s + seg.count, 0)
          let actualResult = targetResult
          let acc = 0
          for (const seg of finalSegs) {
            const ang = (seg.count / finalTotal) * Math.PI * 2
            if (finalLocalAngle < acc + ang) {
              if (seg.isNoWin) {
                actualResult = { type: 'noWin', weight: seg.count }
              } else {
                const gift = gifts.find((g) => g.name === seg.label)
                if (gift) actualResult = { type: 'gift', gift, weight: seg.count }
              }
              break
            }
            acc += ang
          }

          settleRef.current = requestAnimationFrame(settlePointer)
          onSpinEnd(actualResult, currentRot)
        }
      }

      animRef.current = requestAnimationFrame(animate)
    },
  }), [gifts, noWinRemaining, drawWheel, onSpinEnd, applyPointerTransform, settlePointer])

  return (
    <div className="wheel-wrapper">
      <div className="pointer-container" ref={pointerRef}>
        <svg width="40" height="48" viewBox="0 0 40 48">
          <defs>
            <linearGradient id="ptr-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd200" />
              <stop offset="100%" stopColor="#f7971e" />
            </linearGradient>
            <filter id="ptr-shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.5" />
            </filter>
          </defs>
          <polygon
            points="20,44 5,6 35,6"
            fill="url(#ptr-grad)"
            stroke="#e88a00"
            strokeWidth="2"
            strokeLinejoin="round"
            filter="url(#ptr-shadow)"
          />
          <circle cx="20" cy="14" r="4" fill="rgba(255,255,255,0.4)" />
        </svg>
      </div>
      <canvas ref={canvasRef} />
    </div>
  )
})

export default Wheel
