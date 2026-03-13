'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  IconHome, IconHomeFilled,
  IconMatch, IconMatchFilled,
  IconGroup, IconGroupFilled,
  IconRanking, IconRankingFilled,
  IconProfile, IconProfileFilled,
} from '@/components/ui/Icons'

interface NavItem {
  href: string
  label: string
  icon: (active: boolean) => React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Home',
    icon: (active) => active ? <IconHomeFilled size={21} /> : <IconHome size={21} />,
  },
  {
    href: '/matches',
    label: 'Partite',
    icon: (active) => active ? <IconMatchFilled size={21} /> : <IconMatch size={21} />,
  },
  {
    href: '/groups',
    label: 'Gruppo',
    icon: (active) => active ? <IconGroupFilled size={21} /> : <IconGroup size={21} />,
  },
  {
    href: '/rankings',
    label: 'Classifica',
    icon: (active) => active ? <IconRankingFilled size={21} /> : <IconRanking size={21} />,
  },
  {
    href: '/profile',
    label: 'Profilo',
    icon: (active) => active ? <IconProfileFilled size={21} /> : <IconProfile size={21} />,
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav" aria-label="Navigazione principale">
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: 60,
          maxWidth: 600,
          margin: '0 auto',
        }}
      >
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 touch-target',
                'transition-all duration-200',
                active
                  ? 'text-[--color-primary]'
                  : 'text-[--color-text-3] hover:text-[--color-text-2]'
              )}
              aria-current={active ? 'page' : undefined}
              style={{ position: 'relative' }}
            >
              {/* Active indicator bar */}
              {active && (
                <div
                  className="nav-indicator"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '20%',
                    right: '20%',
                    height: 2.5,
                    background: 'var(--color-primary)',
                    borderRadius: '0 0 4px 4px',
                    boxShadow: '0 2px 8px rgba(200, 255, 107, 0.4)',
                  }}
                />
              )}

              {/* Icon with subtle scale on active */}
              <div style={{
                transform: active ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}>
                {icon(active)}
              </div>

              <span
                style={{
                  fontSize: '0.5625rem',
                  fontWeight: active ? 700 : 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-display)',
                  transition: 'opacity 0.2s ease',
                  opacity: active ? 1 : 0.7,
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
