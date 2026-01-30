import { useState, useEffect, useCallback } from 'react'
import { Toast } from './Toast.js'

interface MoveToTomorrowToastProps {
  show: boolean
  onClose: () => void
  onViewTomorrowTasks: () => void
}

export function MoveToTomorrowToast({
  show,
  onClose,
  onViewTomorrowTasks
}: MoveToTomorrowToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!show) return

    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      onClose()
    }, 5000)
    return () => clearTimeout(timer)
  }, [show, onClose])

  const handleClose = useCallback(() => {
    setVisible(false)
    onClose()
  }, [onClose])

  const handleViewTasks = useCallback(() => {
    setVisible(false)
    onClose()
    onViewTomorrowTasks()
  }, [onClose, onViewTomorrowTasks])

  return (
    <Toast
      visible={visible}
      onClose={handleClose}
      emoji="📅"
      message="あしたに移動しました"
      background="var(--lavender)"
      action={{ label: '見る', onClick: handleViewTasks }}
    />
  )
}
