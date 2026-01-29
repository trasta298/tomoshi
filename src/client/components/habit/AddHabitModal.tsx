import { useState } from 'react'
import type { Habit, HabitTime } from '@shared/types'
import { ModalWrapper } from '../ModalWrapper'
import { EmojiPicker } from './EmojiPicker'
import { HabitNameInput } from './HabitNameInput'
import { TimeInputList } from './TimeInputList'
import { ModalFooter } from './ModalFooter'

interface HabitResponse {
  success: boolean
  data?: Habit & { times: HabitTime[] }
  error?: string
}

interface AddHabitModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function AddHabitModal({ onClose, onSuccess }: AddHabitModalProps): JSX.Element {
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('✨')
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(): Promise<void> {
    if (!title.trim()) {
      alert('名前を入力してください')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          icon,
          times: times.map((t) => t + ':00')
        })
      })
      const json: HabitResponse = await res.json()
      if (json.success) {
        onSuccess()
      } else {
        alert(json.error || 'エラーが発生しました')
      }
    } catch {
      alert('エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalWrapper onClose={onClose} position="bottom">
      <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 64px - 80px)' }}>
        <h2 className="heading text-lg mb-4">あたらしい習慣</h2>
        <HabitNameInput value={title} onChange={setTitle} />
        <EmojiPicker value={icon} onChange={setIcon} />
        <TimeInputList times={times} onChange={setTimes} />
      </div>
      <ModalFooter
        onSubmit={handleSubmit}
        disabled={!title.trim()}
        submitting={submitting}
        submitLabel="できた！"
      />
    </ModalWrapper>
  )
}
