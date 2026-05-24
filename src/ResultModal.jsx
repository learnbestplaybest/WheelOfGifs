export default function ResultModal({ result, onClose }) {
  if (!result) return null

  const isWin = result.isWin

  return (
    <div className="modal active">
      <div className="modal-overlay" onClick={onClose} />
      <div className={`modal-body ${isWin ? 'win-modal' : 'lose-modal'}`}>
        <div className="modal-icon">{isWin ? '\uD83C\uDF89' : '\uD83D\uDE14'}</div>
        <h2 className={isWin ? 'win-title' : 'lose-title'}>
          {isWin ? 'Chúc mừng!' : 'Không trúng!'}
        </h2>
        <p>{isWin ? `Bạn đã trúng: ${result.name}` : 'Chúc bạn may mắn lần sau'}</p>
        <button className="btn-primary" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  )
}
