interface HabitNameInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
}

export function HabitNameInput({
  value,
  onChange,
  placeholder = '例: くすり',
  label = 'なまえ'
}: HabitNameInputProps): JSX.Element {
  return (
    <div className="mb-4">
      <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={50}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-form-type="other"
        className="w-full p-3 rounded-xl"
        style={{ background: 'var(--bg-primary)' }}
      />
    </div>
  )
}
