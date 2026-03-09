import { cn } from '@/lib/utils'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  src?: string | null
  name: string
  size?: AvatarSize
  className?: string
  /** show a pulsing active indicator */
  active?: boolean
}

const sizeMap: Record<AvatarSize, { px: number; text: string }> = {
  xs: { px: 28, text: 'text-xs' },
  sm: { px: 36, text: 'text-sm' },
  md: { px: 44, text: 'text-base' },
  lg: { px: 60, text: 'text-xl' },
  xl: { px: 80, text: 'text-2xl' },
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function getColor(name: string) {
  const colors = [
    'rgba(200,255,107,0.2)',
    'rgba(255,184,0,0.2)',
    'rgba(59,130,246,0.2)',
    'rgba(168,85,247,0.2)',
    'rgba(249,115,22,0.2)',
    'rgba(239,68,68,0.2)',
  ]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export function Avatar({ src, name, size = 'md', className, active }: AvatarProps) {
  const { px, text } = sizeMap[size]

  return (
    <div
      className={cn('relative flex-shrink-0', className)}
      style={{ width: px, height: px }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={px}
          height={px}
          style={{
            width: px,
            height: px,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid var(--color-border)',
          }}
        />
      ) : (
        <div
          style={{
            width: px,
            height: px,
            borderRadius: '50%',
            background: getColor(name),
            border: '2px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: 'var(--color-text-1)',
          }}
          className={text}
        >
          {getInitials(name)}
        </div>
      )}

      {active && (
        <span
          className="pulse-dot"
          style={{
            position: 'absolute',
            bottom: 1,
            right: 1,
            width: 8,
            height: 8,
          }}
          aria-label="Online"
        />
      )}
    </div>
  )
}
