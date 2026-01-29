import { useEffect } from 'react'
import { CompleteCheck } from './CompleteCheck'

interface AchievementOverlayProps {
  onClose: () => void
}

export function AchievementOverlay({ onClose }: AchievementOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="achievement-overlay" onClick={onClose}>
      <div className="achievement-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center mb-4">
          <CompleteCheck size="lg" sparkle />
        </div>
        <h2 className="heading text-xl mb-2">きょうの3つ達成!</h2>
        <p style={{ color: 'var(--text-secondary)' }}>すごい! おつかれさま</p>
        <div className="mt-4 flex justify-center gap-1">
          <span className="text-2xl">&#11088;</span>
          <span className="text-2xl">&#11088;</span>
          <span className="text-2xl">&#11088;</span>
        </div>
      </div>
    </div>
  )
}
