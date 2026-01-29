import { useState } from 'react'
import type { Habit, HabitTime } from '@shared/types'
import { ModalWrapper } from '../ModalWrapper'
import { EmojiPicker } from './EmojiPicker'
import { HabitNameInput } from './HabitNameInput'
import { ModalFooter } from './ModalFooter'

interface EditHabitModalProps {
  habit: Habit & { times: HabitTime[] }
  onClose: () => void
  onSuccess: () => void
}

export function EditHabitModal({ habit, onClose, onSuccess }: EditHabitModalProps): JSX.Element {
  const [title, setTitle] = useState(habit.title)
  const [icon, setIcon] = useState(habit.icon || '✨')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(): Promise<void> {
    if (!title.trim()) {
      alert('名前を入力してください')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/habits/${habit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          icon
        })
      })
      if (res.ok) {
        onSuccess()
      } else {
        alert('エラーが発生しました')
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
        <h2 className="heading text-lg mb-4">習慣を編集</h2>
        <HabitNameInput value={title} onChange={setTitle} placeholder="" />
        <EmojiPicker value={icon} onChange={setIcon} />
      </div>
      <ModalFooter
        onSubmit={handleSubmit}
        disabled={!title.trim()}
        submitting={submitting}
        submitLabel="保存"
      />
    </ModalWrapper>
  )
}
