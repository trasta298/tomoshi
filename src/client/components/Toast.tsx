interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastProps {
  visible: boolean
  onClose: () => void
  emoji: string
  message: string
  background: string
  action?: ToastAction
}

export function Toast({ visible, onClose, emoji, message, background, action }: ToastProps) {
  if (!visible) return null

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 whitespace-nowrap"
        style={{ background }}
      >
        <span className="text-xl">{emoji}</span>
        <span className="heading text-sm">{message}</span>
        {action && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              action.onClick()
            }}
            className="px-3 py-1 rounded-full text-sm"
            style={{ background: 'var(--bg-card)' }}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
