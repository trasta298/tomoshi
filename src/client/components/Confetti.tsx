import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface ConfettiPiece {
  id: number
  x: number
  delay: number
  color: string
  size: number
  rotation: number
}

export function Confetti() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])
  const colors = ['#FFDAD6', '#D4F5E4', '#E8DEFF', '#FFF3D1', '#D6EFFF']

  useEffect(() => {
    // Generate pieces only on client side to avoid hydration mismatch
    const newPieces = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage for initial x
      delay: Math.random() * 0.2, // fast start
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 6,
      rotation: Math.random() * 360
    }))
    setPieces(newPieces)
  }, [])

  return (
    <div className="confetti-container">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute"
          initial={{
            opacity: 1,
            y: -50,
            x: `${piece.x}vw`,
            rotate: piece.rotation
          }}
          animate={{
            opacity: [1, 1, 0],
            y: ['0vh', '100vh'],
            rotate: [piece.rotation, piece.rotation + (Math.random() > 0.5 ? 200 : -200)],
            x: [`${piece.x}vw`, `${piece.x + (Math.random() * 10 - 5)}vw`] // minimal sway
          }}
          transition={{
            duration: 2.5 + Math.random(),
            ease: [0.25, 0.1, 0.25, 1], // easeOutCubic-ish for natural fall
            delay: piece.delay
          }}
          style={{
            background: piece.color,
            width: piece.size,
            height: piece.size,
            borderRadius: Math.random() > 0.6 ? '50%' : '4px'
          }}
        />
      ))}
    </div>
  )
}
