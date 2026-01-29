interface CompleteCheckProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'mint' | 'coral' | 'lavender' | 'sky' | 'lemon'
  sparkle?: boolean
  className?: string
}

/**
 * 完了時のチェックマークアニメーションコンポーネント
 * Jelly Pop + stroke-dashoffset によるチェックマーク描画
 *
 * @example
 * <CompleteCheck />
 * <CompleteCheck size="lg" color="coral" sparkle />
 */
export function CompleteCheck({
  size = 'md',
  color,
  sparkle = false,
  className = ''
}: CompleteCheckProps) {
  const sizeClass = size === 'md' ? '' : `complete-check--${size}`
  const colorClass = color ? `complete-check--${color}` : ''
  const sparkleClass = sparkle ? 'complete-check--sparkle' : ''

  return (
    <div
      className={`complete-check ${sizeClass} ${colorClass} ${sparkleClass} ${className}`.trim()}
    >
      <div className="complete-check__circle">
        <svg className="complete-check__icon" viewBox="0 0 24 24">
          <path
            className="complete-check__path"
            d="M4 12l6 6L20 6"
          />
        </svg>
      </div>
    </div>
  )
}
