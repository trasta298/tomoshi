import { motion } from 'framer-motion'
import { checkmarkVariants, spring } from '../styles/animations'

interface CompleteCheckProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'mint' | 'coral' | 'lavender' | 'sky' | 'lemon'
  sparkle?: boolean
  className?: string
}

export function CompleteCheck({
  size = 'md',
  color,
  sparkle = false,
  className = ''
}: CompleteCheckProps) {
  const sizeMap = {
    sm: 24,
    md: 48,
    lg: 64
  }

  const currentSize = sizeMap[size]
  const colorVar = color ? `var(--${color})` : 'var(--mint)'

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: currentSize, height: currentSize }}>
      {sparkle && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, color-mix(in srgb, ${colorVar} 40%, transparent) 0%, transparent 70%)` }}
        />
      )}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={spring.bouncy}
        className="flex items-center justify-center w-full h-full rounded-full"
        style={{ background: colorVar }}
      >
        <svg
          width={currentSize * 0.5}
          height={currentSize * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={size === 'sm' ? 3.5 : 3}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--text-primary)' }}
        >
          <motion.path
            d="M4 12l6 6L20 6"
            variants={checkmarkVariants}
            initial="unchecked"
            animate="checked"
          />
        </svg>
      </motion.div>
    </div>
  )
}
