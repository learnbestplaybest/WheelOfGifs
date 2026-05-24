import { useState, useCallback } from 'react'
import { STORAGE_KEY } from './constants'
import { useLocalStorage } from './useLocalStorage'
import SetupScreen from './SetupScreen'
import GameScreen from './GameScreen'
import AdminScreen from './AdminScreen'
import ResultModal from './ResultModal'
import Confetti from './Confetti'
import './App.css'

const INITIAL_STATE = {
  phase: 'setup',
  gifts: [],
  totalSpins: 0,
  remainingSpins: 0,
  noWinTotal: 0,
  noWinRemaining: 0,
  history: [],
  rotation: 0,
}

export default function App() {
  const [state, setState, clearState] = useLocalStorage(STORAGE_KEY, INITIAL_STATE)
  const [modalResult, setModalResult] = useState(null)
  const [confettiKey, setConfettiKey] = useState(0)

  const handleStart = useCallback(
    (gifts, totalSpins, noWin) => {
      setState({
        phase: 'playing',
        gifts,
        totalSpins,
        remainingSpins: totalSpins,
        noWinTotal: noWin,
        noWinRemaining: noWin,
        history: [],
        rotation: 0,
      })
    },
    [setState],
  )

  const handleSpinResult = useCallback(
    (result, newRotation) => {
      setState((prev) => {
        const spinNum = prev.totalSpins - prev.remainingSpins + 1
        const isWin = result.type === 'gift'
        const resultName = isWin ? result.gift.name : 'Khong trung'

        const newGifts = prev.gifts.map((g) => {
          if (isWin && g.name === result.gift.name) {
            return { ...g, remaining: g.remaining - 1, won: g.won + 1 }
          }
          return g
        })

        const newNoWin = isWin ? prev.noWinRemaining : prev.noWinRemaining - 1
        const newRemaining = prev.remainingSpins - 1
        const newHistory = [{ spinNum, result: resultName, isWin }, ...prev.history]

        setModalResult({ isWin, name: resultName })
        if (isWin) setConfettiKey((k) => k + 1)

        return {
          ...prev,
          phase: 'playing',
          gifts: newGifts,
          remainingSpins: newRemaining,
          noWinRemaining: newNoWin,
          history: newHistory,
          rotation: newRotation,
        }
      })
    },
    [setState],
  )

  const handleCloseModal = useCallback(() => {
    setModalResult(null)
  }, [])

  // Go to admin screen
  const handleAdmin = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'admin' }))
  }, [setState])

  // Back to game from admin
  const handleBackToGame = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'playing' }))
  }, [setState])

  // Update gifts & total spins from admin screen
  const handleUpdateConfig = useCallback(
    (newGifts, newTotalSpins) => {
      setState((prev) => {
        const spinsUsed = prev.totalSpins - prev.remainingSpins
        const newRemaining = Math.max(0, newTotalSpins - spinsUsed)
        const totalGiftsQty = newGifts.reduce((s, g) => s + g.total, 0)
        const newNoWinTotal = Math.max(0, newTotalSpins - totalGiftsQty)
        const noWinUsed = prev.noWinTotal - prev.noWinRemaining
        const newNoWinRemaining = Math.max(0, newNoWinTotal - noWinUsed)
        return {
          ...prev,
          gifts: newGifts,
          totalSpins: newTotalSpins,
          remainingSpins: newRemaining,
          noWinTotal: newNoWinTotal,
          noWinRemaining: newNoWinRemaining,
          phase: 'playing',
        }
      })
    },
    [setState],
  )

  // Soft reset: keep gifts, go back to setup to re-configure spins
  const handleSoftReset = useCallback(() => {
    setState((prev) => ({
      ...INITIAL_STATE,
      phase: 'setup',
      gifts: prev.gifts.map((g) => ({ ...g, remaining: g.total, won: 0 })),
    }))
    setModalResult(null)
  }, [setState])

  return (
    <>
      {state.phase === 'setup' && (
        <SetupScreen
          key={JSON.stringify(state.gifts.map((g) => g.name))}
          initialGifts={state.gifts}
          onStart={handleStart}
        />
      )}

      {state.phase === 'playing' && (
        <GameScreen
          gifts={state.gifts}
          remainingSpins={state.remainingSpins}
          noWinRemaining={state.noWinRemaining}
          rotation={state.rotation}
          onSpinResult={handleSpinResult}
          onAdmin={handleAdmin}
          resizePaused={modalResult !== null}
        />
      )}

      {state.phase === 'admin' && (
        <AdminScreen
          gifts={state.gifts}
          totalSpins={state.totalSpins}
          remainingSpins={state.remainingSpins}
          noWinRemaining={state.noWinRemaining}
          noWinTotal={state.noWinTotal}
          history={state.history}
          onBackToGame={handleBackToGame}
          onSoftReset={handleSoftReset}
          onUpdateConfig={handleUpdateConfig}
        />
      )}

      <ResultModal result={modalResult} onClose={handleCloseModal} />
      <Confetti key={confettiKey} active={confettiKey > 0} />
    </>
  )
}
