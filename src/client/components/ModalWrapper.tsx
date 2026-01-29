import type { ReactNode } from 'react'

interface ModalWrapperProps {
  children: ReactNode
  onClose: () => void
  /** 'bottom' = ボトムシート, 'center' = 中央配置 */
  position?: 'bottom' | 'center'
  /** モーダルの最大幅 (default: max-w-lg) */
  maxWidth?: string
}

export function ModalWrapper({
  children,
  onClose,
  position = 'bottom',
  maxWidth = 'max-w-lg'
}: ModalWrapperProps) {
  const isBottom = position === 'bottom'

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center ${isBottom ? 'items-end' : 'items-center p-4'}`}
      style={{ paddingBottom: '64px' }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Modal */}
      <div
        className={`relative w-full ${maxWidth} bg-[var(--bg-card)] animate-fade-in ${
          isBottom ? 'rounded-t-3xl' : 'rounded-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
