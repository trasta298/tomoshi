import { useState } from 'react'
import type { Moya } from '@shared/types'
import { getMoyaOpacity } from '@shared/types'

interface MoyaListProps {
  moyas: Moya[]
  onDelete: (id: string) => void
  onExtend: (id: string) => void
  onPromote: (id: string) => void
}

export function MoyaList({ moyas, onDelete, onExtend, onPromote }: MoyaListProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (moyas.length === 0) {
    return null
  }

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full mb-3"
        style={{ color: 'var(--text-primary)' }}
      >
        <h2 className="heading text-lg">もやもや</h2>
        <span
          className="text-sm transition-transform"
          style={{
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)',
            color: 'var(--text-secondary)'
          }}
        >
          ▼
        </span>
      </button>

      {!collapsed && (
        <div className="space-y-2">
          {moyas.map((moya) => (
            <MoyaItem
              key={moya.id}
              moya={moya}
              onDelete={() => onDelete(moya.id)}
              onExtend={() => onExtend(moya.id)}
              onPromote={() => onPromote(moya.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface MoyaItemProps {
  moya: Moya
  onDelete: () => void
  onExtend: () => void
  onPromote: () => void
}

function MoyaItem({ moya, onDelete, onExtend, onPromote }: MoyaItemProps) {
  const [showActions, setShowActions] = useState(false)
  const opacity = getMoyaOpacity(moya.created_at, moya.extended_at)
  const isExpiring = opacity <= 0.4

  return (
    <div
      className="card card--lavender flex items-center gap-3 relative"
      style={{ opacity }}
      onClick={() => setShowActions(!showActions)}
    >
      <span className="flex-1">{moya.content}</span>

      {isExpiring && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onExtend()
          }}
          className="text-xs px-2 py-1 rounded-full"
          style={{ background: 'var(--lemon)' }}
        >
          延長
        </button>
      )}

      {showActions && (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPromote()
            }}
            className="p-2 rounded-full"
            style={{ background: 'var(--coral)' }}
            title="今日のタスクに追加"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-2 rounded-full opacity-50"
            title="削除"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
