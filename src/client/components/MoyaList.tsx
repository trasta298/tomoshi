import { useState } from 'react'
import type { Moya } from '@shared/types'

// 設計仕様に合わせた透明度計算
function getMoyaOpacity(createdAt: number, extendedAt: number | null): number {
  const baseTime = extendedAt ?? createdAt
  const daysPassed = Math.floor((Date.now() - baseTime) / (1000 * 60 * 60 * 24))

  if (daysPassed <= 7) return 1      // 0-7日: 通常表示
  if (daysPassed <= 14) return 0.7   // 8-14日: 少し薄く
  if (daysPassed <= 21) return 0.4   // 15-21日: さらに薄く
  return 0.2                          // 22日以降: 消える直前
}

// 経過日数を取得
function getDaysPassed(createdAt: number, extendedAt: number | null): number {
  const baseTime = extendedAt ?? createdAt
  return Math.floor((Date.now() - baseTime) / (1000 * 60 * 60 * 24))
}

// 30日以上経過したものをフィルタリング（自動非表示）
function filterExpiredMoyas(moyas: Moya[]): Moya[] {
  return moyas.filter((moya) => {
    const daysPassed = getDaysPassed(moya.created_at, moya.extended_at)
    return daysPassed < 30
  })
}

interface MoyaListProps {
  moyas: Moya[]
  onDelete: (id: string) => void
  onExtend: (id: string) => void
  onPromote: (id: string) => void
  canPromote?: boolean
  onAdd?: () => void
}

export function MoyaList({ moyas, onDelete, onExtend, onPromote, canPromote = true, onAdd }: MoyaListProps) {
  const [collapsed, setCollapsed] = useState(false)

  // 30日以上経過したものを非表示
  const activeMoyas = filterExpiredMoyas(moyas)

  if (activeMoyas.length === 0) {
    return (
      <div>
        <h2 className="heading text-lg mb-3 flex items-center gap-2">
          もやもや
        </h2>
        <button
          onClick={onAdd}
          className="w-full text-center py-6 rounded-2xl moya-empty transition-all hover:opacity-80 active:scale-[0.99]"
          style={{ cursor: onAdd ? 'pointer' : 'default' }}
        >
          <p style={{ color: 'var(--text-secondary)' }}>
            + 気になることを入れておこう
          </p>
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 mb-3"
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
          {activeMoyas.map((moya) => (
            <MoyaItem
              key={moya.id}
              moya={moya}
              onDelete={() => onDelete(moya.id)}
              onExtend={() => onExtend(moya.id)}
              onPromote={() => onPromote(moya.id)}
              canPromote={canPromote}
            />
          ))}
          {/* 追加ボタン */}
          {onAdd && (
            <button
              onClick={onAdd}
              className="w-full py-3 text-center rounded-2xl transition-all hover:opacity-70 active:scale-[0.99]"
              style={{
                color: 'var(--text-secondary)',
                background: 'rgba(0, 0, 0, 0.03)'
              }}
            >
              + 追加
            </button>
          )}
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
  canPromote: boolean
}

function MoyaItem({ moya, onDelete, onExtend, onPromote, canPromote }: MoyaItemProps) {
  const [showActions, setShowActions] = useState(false)
  const opacity = getMoyaOpacity(moya.created_at, moya.extended_at)
  const daysPassed = getDaysPassed(moya.created_at, moya.extended_at)

  // 22日以降は延長ボタンを表示（設計仕様）
  const isExpiring = daysPassed >= 22

  // タップで即座に昇格（設計仕様: ワンタップで昇格）
  const handleTap = () => {
    if (canPromote) {
      onPromote()
    } else {
      setShowActions(!showActions)
    }
  }

  return (
    <div
      className="card flex items-center gap-3 relative cursor-pointer"
      style={{ opacity }}
      onClick={handleTap}
    >
      {/* 昇格可能時は↑アイコン表示 */}
      {canPromote && (
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          ↑
        </span>
      )}

      <span className="flex-1">{moya.content}</span>

      {/* 22日以降は延長ボタン表示 */}
      {isExpiring && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onExtend()
          }}
          className="text-xs px-2 py-1 rounded-full"
          style={{ background: 'var(--lemon)' }}
          title="14日延長"
        >
          延長
        </button>
      )}

      {/* 削除ボタン（常に表示） */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="p-1 opacity-30 hover:opacity-100 transition-opacity"
        title="削除"
      >
        <svg
          width="14"
          height="14"
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
  )
}
