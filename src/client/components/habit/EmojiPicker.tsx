const EMOJI_OPTIONS = ['💊', '🚶', '💧', '📖', '🏃', '🧘', '💪', '🍎', '😴', '✨']

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
  label?: string
}

export function EmojiPicker({ value, onChange, label = 'アイコン' }: EmojiPickerProps): JSX.Element {
  return (
    <div className="mb-4">
      <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {EMOJI_OPTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
              value === emoji ? 'ring-2 ring-[var(--coral)]' : ''
            }`}
            style={{ background: 'var(--bg-primary)' }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
