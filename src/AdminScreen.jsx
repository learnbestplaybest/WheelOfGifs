import { useState, useMemo } from 'react'
import { COLORS, NO_WIN_COLOR } from './constants'

export default function AdminScreen({
  gifts,
  totalSpins,
  remainingSpins,
  noWinRemaining,
  noWinTotal,
  history,
  onBackToGame,
  onSoftReset,
  onUpdateConfig,
}) {
  const isDone = remainingSpins <= 0
  const spinsUsed = totalSpins - remainingSpins

  // Tab state
  const [activeTab, setActiveTab] = useState('stats')

  // ── Gift editing state ──────────────────────────────────────
  const [localGifts, setLocalGifts] = useState(() =>
    gifts.map((g, i) => ({ ...g, color: COLORS[i % COLORS.length] })),
  )
  const [editingIndex, setEditingIndex] = useState(null)
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState('')
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')
  const [giftError, setGiftError] = useState('')

  // ── Total spins state ───────────────────────────────────────
  const [newTotalSpins, setNewTotalSpins] = useState(String(totalSpins))
  const [saveSuccess, setSaveSuccess] = useState(false)

  const totalGifts = useMemo(() => localGifts.reduce((s, g) => s + g.total, 0), [localGifts])
  const spinsNum = parseInt(newTotalSpins) || 0
  const noWinCount = Math.max(0, spinsNum - totalGifts)
  const canSave =
    localGifts.length > 0 &&
    spinsNum >= totalGifts &&
    spinsNum >= spinsUsed &&
    spinsNum > 0

  // ── Gift management ─────────────────────────────────────────
  function addNewGift() {
    const trimmed = newName.trim()
    const q = parseInt(newQty)
    if (!trimmed) { setGiftError('Nhập tên phần quà'); return }
    if (!q || q < 1) { setGiftError('Số lượng phải >= 1'); return }
    if (localGifts.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) {
      setGiftError('Phần quà này đã tồn tại!')
      return
    }
    const color = COLORS[localGifts.length % COLORS.length]
    setLocalGifts([...localGifts, { name: trimmed, total: q, remaining: q, color, won: 0 }])
    setNewName('')
    setNewQty('')
    setGiftError('')
  }

  function removeGift(index) {
    const g = localGifts[index]
    if (g.won > 0) {
      if (!confirm(`"${g.name}" đã có ${g.won} lượt trúng. Vẫn xóa?`)) return
    }
    const next = localGifts.filter((_, i) => i !== index)
    next.forEach((gift, i) => (gift.color = COLORS[i % COLORS.length]))
    setLocalGifts(next)
    setGiftError('')
  }

  function startEdit(index) {
    setEditingIndex(index)
    setEditName(localGifts[index].name)
    setEditQty(String(localGifts[index].total))
    setGiftError('')
  }

  function cancelEdit() {
    setEditingIndex(null)
    setGiftError('')
  }

  function saveEdit(index) {
    const trimmed = editName.trim()
    const q = parseInt(editQty)
    const g = localGifts[index]
    if (!trimmed) { setGiftError('Nhập tên phần quà'); return }
    if (!q || q < 1) { setGiftError('Số lượng phải >= 1'); return }
    if (q < (g.won || 0)) {
      setGiftError(`Số lượng phải >= số đã trao (${g.won})`)
      return
    }
    if (
      localGifts.some(
        (gift, i) => i !== index && gift.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setGiftError('Tên này đã tồn tại!')
      return
    }
    setLocalGifts(
      localGifts.map((gift, i) =>
        i === index
          ? { ...gift, name: trimmed, total: q, remaining: q - (gift.won || 0) }
          : gift,
      ),
    )
    setEditingIndex(null)
    setGiftError('')
  }

  // ── Save changes ────────────────────────────────────────────
  function handleSave() {
    if (!canSave) return
    onUpdateConfig(
      localGifts.map((g, i) => ({ ...g, color: COLORS[i % COLORS.length] })),
      spinsNum,
    )
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  function handleReset() {
    if (confirm('Quay lại từ đầu? Các phần quà sẽ được giữ nguyên, chỉ reset lượt quay.')) {
      onSoftReset()
    }
  }

  return (
    <div className="screen active">
      <h1>Cài đặt & Thống kê</h1>

      {/* ── Tabs ── */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Thống kê
        </button>
        <button
          className={`admin-tab ${activeTab === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          ✏️ Chỉnh sửa
        </button>
      </div>

      <div className="container">
        {/* ════════════ STATS TAB ════════════ */}
        {activeTab === 'stats' && (
          <>
            {isDone && (
              <div
                className="card"
                style={{ textAlign: 'center', borderColor: 'rgba(255,210,0,0.3)' }}
              >
                <h2>Đã hoàn thành tất cả lượt quay!</h2>
              </div>
            )}

            <div className="card">
              <h3>Phần quà còn lại</h3>
              {gifts.map((g, i) => {
                const pct = g.total > 0 ? (g.remaining / g.total) * 100 : 0
                return (
                  <div key={i} className="stat-item">
                    <div className="stat-label">
                      <div className="gift-color" style={{ background: g.color }} />
                      <span>{g.name}</span>
                    </div>
                    <div className="stat-bar-bg">
                      <div
                        className="stat-bar-fill"
                        style={{ width: `${pct}%`, background: g.color }}
                      />
                    </div>
                    <span className="stat-count">
                      {g.remaining}/{g.total}
                    </span>
                  </div>
                )
              })}
              {noWinTotal > 0 && (
                <div className="stat-item">
                  <div className="stat-label">
                    <div className="gift-color" style={{ background: NO_WIN_COLOR }} />
                    <span>Không trúng</span>
                  </div>
                  <div className="stat-bar-bg">
                    <div
                      className="stat-bar-fill"
                      style={{
                        width: `${noWinTotal > 0 ? (noWinRemaining / noWinTotal) * 100 : 0}%`,
                        background: NO_WIN_COLOR,
                      }}
                    />
                  </div>
                  <span className="stat-count">
                    {noWinRemaining}/{noWinTotal}
                  </span>
                </div>
              )}
              <div className="total-bar">
                <span>
                  Lượt quay còn lại: <strong>{remainingSpins}</strong> / {totalSpins}
                </span>
              </div>
            </div>

            <div className="card">
              <h3>Lịch sử quay</h3>
              <div className="history-list">
                {history.length === 0 ? (
                  <p className="empty-text">Chưa có lượt quay nào</p>
                ) : (
                  history.map((h, i) => (
                    <div key={i} className={`history-item ${h.isWin ? 'win' : 'lose'}`}>
                      <span className="spin-num">#{h.spinNum}</span>
                      <span className={`spin-result ${h.isWin ? 'win-text' : 'lose-text'}`}>
                        {h.result}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* ════════════ EDIT TAB ════════════ */}
        {activeTab === 'edit' && (
          <>
            {/* Add new gift */}
            <div className="card">
              <h2>Thêm phần quà mới</h2>
              <div className="add-form">
                <input
                  type="text"
                  placeholder="Tên phần quà"
                  maxLength={30}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNewGift()}
                />
                <input
                  type="number"
                  placeholder="Số lượng"
                  min={1}
                  max={9999}
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNewGift()}
                />
                <button className="btn-add" onClick={addNewGift}>
                  + Thêm
                </button>
              </div>
            </div>

            {/* Gift list */}
            <div className="card">
              <h2>Danh sách phần quà</h2>
              {localGifts.length === 0 ? (
                <p className="empty-text">Chưa có phần quà nào</p>
              ) : (
                localGifts.map((g, i) => (
                  <div key={i} className="gift-item" style={{ borderLeftColor: g.color }}>
                    {editingIndex === i ? (
                      /* ── Inline edit mode ── */
                      <div className="gift-edit-row">
                        <div className="gift-edit-inputs">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={30}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(i)}
                            autoFocus
                          />
                          <input
                            type="number"
                            value={editQty}
                            min={g.won || 1}
                            max={9999}
                            onChange={(e) => setEditQty(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(i)}
                          />
                        </div>
                        <div className="gift-edit-actions">
                          <button className="btn-save-edit" onClick={() => saveEdit(i)} title="Lưu">
                            ✓
                          </button>
                          <button className="btn-cancel-edit" onClick={cancelEdit} title="Hủy">
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Normal display mode ── */
                      <>
                        <div className="gift-info">
                          <div className="gift-color" style={{ background: g.color }} />
                          <span className="gift-name">{g.name}</span>
                          <span className="gift-qty">x{g.total}</span>
                          {g.won > 0 && (
                            <span className="gift-won">đã trao: {g.won}</span>
                          )}
                        </div>
                        <div className="gift-action-btns">
                          <button className="btn-edit" onClick={() => startEdit(i)}>
                            Sửa
                          </button>
                          <button className="btn-danger" onClick={() => removeGift(i)}>
                            Xóa
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}

              {giftError && <p className="error-msg">{giftError}</p>}

              <div className="total-bar">
                <span>
                  Tổng phần quà: <strong>{totalGifts}</strong>
                </span>
              </div>
            </div>

            {/* Total spins */}
            <div className="card">
              <h2>Tổng số lượt quay</h2>
              <div className="spins-setting">
                <input
                  type="number"
                  placeholder="Tổng số lượt quay"
                  min={Math.max(totalGifts, spinsUsed, 1)}
                  max={99999}
                  value={newTotalSpins}
                  onChange={(e) => setNewTotalSpins(e.target.value)}
                />
                <p className="hint">
                  Đã quay: <strong style={{ color: '#ffd200' }}>{spinsUsed}</strong>. Tổng phải
                  &gt;= phần quà ({totalGifts}) và &gt;= số đã quay ({spinsUsed}).
                </p>
                <p className="no-win-display">
                  Lượt không trúng: <strong>{noWinCount}</strong>
                </p>
              </div>
            </div>

            {/* Save */}
            <div className="start-area">
              <button className="btn-primary" disabled={!canSave} onClick={handleSave}>
                {saveSuccess ? '✓ Đã lưu!' : '💾 Lưu thay đổi'}
              </button>
              {!canSave && localGifts.length > 0 && (
                <p className="hint" style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                  Tổng lượt quay phải &gt;= {Math.max(totalGifts, spinsUsed)}
                </p>
              )}
            </div>
          </>
        )}

        {/* ── Bottom actions (always visible) ── */}
        <div className="admin-actions">
          <button className="btn-primary" onClick={onBackToGame}>
            Quay về vòng quay
          </button>
          <button className="btn-secondary" onClick={handleReset}>
            Quay lại từ đầu (giữ phần quà)
          </button>
        </div>
      </div>
    </div>
  )
}
