interface TimeInputListProps {
  times: string[]
  onChange: (times: string[]) => void
  maxTimes?: number
  label?: string
}

export function TimeInputList({
  times,
  onChange,
  maxTimes = 5,
  label = 'いつ？'
}: TimeInputListProps): JSX.Element {
  function handleAddTime(): void {
    if (times.length >= maxTimes) return
    onChange([...times, '12:00'])
  }

  function handleRemoveTime(index: number): void {
    if (times.length <= 1) return
    onChange(times.filter((_, i) => i !== index))
  }

  function handleUpdateTime(index: number, value: string): void {
    const newTimes = [...times]
    newTimes[index] = value
    onChange(newTimes)
  }

  return (
    <div className="mb-4">
      <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {times.map((time, index) => (
          <div key={index} className="flex items-center gap-1">
            <input
              type="time"
              value={time}
              onChange={(e) => handleUpdateTime(index, e.target.value)}
              autoComplete="off"
              data-form-type="other"
              className="p-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-primary)' }}
            />
            {times.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveTime(index)}
                className="text-sm opacity-50"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {times.length < maxTimes && (
          <button
            type="button"
            onClick={handleAddTime}
            className="chip chip--sky"
            style={{ cursor: 'pointer', border: 'none' }}
          >
            ＋ 時間を追加
          </button>
        )}
      </div>
    </div>
  )
}
