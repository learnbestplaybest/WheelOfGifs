import { useRef, useState, useCallback } from 'react'
import Wheel from './Wheel'

export default function GameScreen({
  gifts,
  remainingSpins,
  noWinRemaining,
  rotation,
  onSpinResult,
  onAdmin,
  resizePaused,
}) {
  const wheelRef = useRef(null)
  const [spinning, setSpinning] = useState(false)

  const determineResult = useCallback(() => {
    const pool = []
    for (const g of gifts) {
      if (g.remaining > 0) pool.push({ type: 'gift', gift: g, weight: g.remaining })
    }
    if (noWinRemaining > 0) pool.push({ type: 'noWin', weight: noWinRemaining })

    const totalWeight = pool.reduce((s, p) => s + p.weight, 0)
    let rand = Math.random() * totalWeight

    for (const p of pool) {
      rand -= p.weight
      if (rand <= 0) return p
    }
    return pool[pool.length - 1]
  }, [gifts, noWinRemaining])

  function handleSpin() {
    if (spinning || remainingSpins <= 0) return
    setSpinning(true)
    const result = determineResult()
    wheelRef.current?.spin(result)
  }

  const handleSpinEnd = useCallback(
    (result, newRotation) => {
      setSpinning(false)
      onSpinResult(result, newRotation)
    },
    [onSpinResult],
  )

  const canSpin = !spinning && remainingSpins > 0

  return (
    <div className="game-fullscreen">
      <img className="brand-logo" src="/simplifydalat_logo.webp" alt="Simplify Dalat" />

      <button className="admin-toggle" onClick={onAdmin} title="Cai dat">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      </button>

      <div
        className={`wheel-clickable ${canSpin ? 'can-spin' : ''} ${spinning ? 'is-spinning' : ''}`}
        onClick={handleSpin}
      >
        <Wheel
          ref={wheelRef}
          gifts={gifts}
          noWinRemaining={noWinRemaining}
          rotation={rotation}
          onSpinEnd={handleSpinEnd}
          resizePaused={resizePaused}
        />
        <button
          className={`center-spin-btn ${spinning ? 'spinning' : ''}`}
          disabled={!canSpin}
          onClick={(e) => {
            e.stopPropagation()
            handleSpin()
          }}
        >
          {remainingSpins <= 0 ? 'HET' : 'QUAY!'}
        </button>
      </div>
    </div>
  )
}
