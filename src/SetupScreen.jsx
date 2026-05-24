import { useState, useMemo } from 'react'
import { COLORS } from './constants'

export default function SetupScreen({ initialGifts, onStart }) {
  const [gifts, setGifts] = useState(() =>
    (initialGifts || []).map((g, i) => ({ ...g, color: COLORS[i % COLORS.length] })),
  )
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [totalSpins, setTotalSpins] = useState('')
  const [error, setError] = useState('')

  const totalGifts = useMemo(() => gifts.reduce((s, g) => s + g.total, 0), [gifts])
  const spinsNum = parseInt(totalSpins) || 0
  const noWinCount = Math.max(0, spinsNum - totalGifts)
  const canStart = gifts.length > 0 && spinsNum >= totalGifts && spinsNum > 0

  function addGift() {
    const trimmed = name.trim()
    const q = parseInt(qty)
    if (!trimmed) return
    if (!q || q < 1) return
    if (gifts.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('Phan qua nay da ton tai!')
      return
    }

    const color = COLORS[gifts.length % COLORS.length]
    setGifts([...gifts, { name: trimmed, total: q, remaining: q, color, won: 0 }])
    setName('')
    setQty('')
    setError('')
  }

  function removeGift(index) {
    const next = gifts.filter((_, i) => i !== index)
    next.forEach((g, i) => (g.color = COLORS[i % COLORS.length]))
    setGifts(next)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') addGift()
  }

  function handleStart() {
    if (!canStart) return
    const noWin = spinsNum - totalGifts
    onStart(
      gifts.map((g) => ({ ...g, remaining: g.total, won: 0 })),
      spinsNum,
      noWin,
    )
  }

  return (
    <div className="screen active">
      <h1>Vong Quay May Man</h1>
      <div className="container">
        <div className="card">
          <h2>Them phan qua</h2>
          <div className="add-form">
            <input
              type="text"
              placeholder="Ten phan qua"
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <input
              type="number"
              placeholder="So luong"
              min={1}
              max={9999}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="btn-add" onClick={addGift}>
              + Them
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Danh sach phan qua</h2>
          {gifts.length === 0 ? (
            <p className="empty-text">Chua co phan qua nao</p>
          ) : (
            gifts.map((g, i) => (
              <div key={i} className="gift-item" style={{ borderLeftColor: g.color }}>
                <div className="gift-info">
                  <div className="gift-color" style={{ background: g.color }} />
                  <span className="gift-name">{g.name}</span>
                  <span className="gift-qty">x{g.total}</span>
                </div>
                <button className="btn-danger" onClick={() => removeGift(i)}>
                  Xoa
                </button>
              </div>
            ))
          )}
          <div className="total-bar">
            <span>
              Tong phan qua: <strong>{totalGifts}</strong>
            </span>
          </div>
        </div>

        <div className="card">
          <h2>Cai dat luot quay</h2>
          <div className="spins-setting">
            <input
              type="number"
              placeholder="Tong so luot quay"
              min={1}
              max={99999}
              value={totalSpins}
              onChange={(e) => setTotalSpins(e.target.value)}
            />
            <p className="hint">
              Toi thieu bang tong phan qua ({totalGifts}). Phan du se la luot "Khong trung".
            </p>
            <p className="no-win-display">
              Luot khong trung: <strong>{noWinCount}</strong>
            </p>
          </div>
        </div>

        {error && <p className="error-msg">{error}</p>}
        <div className="start-area">
          <button className="btn-primary" disabled={!canStart} onClick={handleStart}>
            Bat dau quay!
          </button>
        </div>
      </div>
    </div>
  )
}
