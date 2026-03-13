// Custom SVG icons for Kicksy — replacing emojis with cohesive sport-themed SVGs
// Each icon is a React component accepting size and color props

interface IconProps {
  size?: number
  color?: string
  className?: string
}

export function IconHome({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 10.5L12 3l9 7.5V20a2 2 0 01-2 2H5a2 2 0 01-2-2V10.5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 22V14h6v8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconHomeFilled({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 10.5L12 3l9 7.5V20a2 2 0 01-2 2h-4v-8H9v8H5a2 2 0 01-2-2V10.5z" fill={color} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconMatch({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2"/>
      <path d="M3 9h18" stroke={color} strokeWidth="2"/>
      <path d="M9 2v4M15 2v4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="15.5" r="2.5" stroke={color} strokeWidth="1.5"/>
    </svg>
  )
}

export function IconMatchFilled({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 2v3M15 2v3" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <rect x="3" y="4" width="18" height="18" rx="2" fill={color} stroke={color} strokeWidth="1.5"/>
      <path d="M3 9h18" stroke="var(--color-bg, #0A0C12)" strokeWidth="2"/>
      <circle cx="12" cy="15.5" r="2.5" fill="var(--color-bg, #0A0C12)"/>
    </svg>
  )
}

export function IconGroup({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="9" cy="7" r="3.5" stroke={color} strokeWidth="2"/>
      <path d="M2 20v-1a5 5 0 015-5h4a5 5 0 015 5v1" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="17.5" cy="8.5" r="2.5" stroke={color} strokeWidth="1.5"/>
      <path d="M19 14c1.5.5 3 2 3 4v2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconGroupFilled({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="9" cy="7" r="3.5" fill={color} stroke={color} strokeWidth="1.5"/>
      <path d="M2 20v-1a5 5 0 015-5h4a5 5 0 015 5v1" fill={color} stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="17.5" cy="8.5" r="2.5" fill={color} stroke={color} strokeWidth="1"/>
      <path d="M19 14c1.5.5 3 2 3 4v2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconRanking({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M8 21V11h-4v10h4zM14 21V6h-4v15h4zM20 21V3h-4v18h4z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconRankingFilled({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 11h4v10H4V11z" fill={color} opacity="0.5"/>
      <path d="M10 6h4v15h-4V6z" fill={color} opacity="0.75"/>
      <path d="M16 3h4v18h-4V3z" fill={color}/>
      <path d="M8 21V11h-4v10h4zM14 21V6h-4v15h4zM20 21V3h-4v18h4z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconProfile({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2"/>
      <path d="M4 21v-1a6 6 0 0112 0v1" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconProfileFilled({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="4" fill={color} stroke={color} strokeWidth="1.5"/>
      <path d="M4 21v-1a6 6 0 0112 0v1" fill={color} stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// --- Sport / Action icons ---

export function IconSoccerBall({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" fill="none"/>
      <path d="M12 7l2.94 2.14-.36 3.54-5.16 0-.36-3.54L12 7z" fill={color} opacity="0.9"/>
      <path d="M12 7l-2.94 2.14L7 5.8M12 7l2.94 2.14L17 5.8M9.06 9.14l-4 1.36M14.94 9.14l4 1.36M9.42 12.68l-1.82 3.52M14.58 12.68l1.82 3.52M9.42 12.68h5.16M10.4 17.7l1.6-1.5 1.6 1.5" stroke={color} strokeWidth="1" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconLocation({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={color} strokeWidth="2"/>
      <circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth="2"/>
    </svg>
  )
}

export function IconClock({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2"/>
      <path d="M12 7v5l3.5 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconCalendar({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2"/>
      <path d="M3 9h18M9 2v4M15 2v4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconChevronRight({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 6l6 6-6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconTrophy({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 3h12v6a6 6 0 01-12 0V3z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M6 5H3v2a3 3 0 003 3M18 5h3v2a3 3 0 01-3 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 15v3M8 21h8M12 18a2 2 0 100-0z" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconShield({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3L4 7v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V7l-8-4z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconBolt({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill={color}/>
    </svg>
  )
}

export function IconPlus({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconCheck({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 13l4 4L19 7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconStar({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l7.1-1.01L12 2z" fill={color}/>
    </svg>
  )
}

export function IconFire({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 23c4.97 0 8-3.03 8-7.5 0-3-1.73-5.5-4-8.5-1.27-1.68-2-3.5-2-5.5 0 0-2 2-2 4.5 0 1.5-.5 2.5-1.5 2.5S9 7.5 9 6c0-1.02.3-2.06.8-3C6.5 5.5 4 9 4 15.5 4 19.97 7.03 23 12 23z" fill={color}/>
    </svg>
  )
}

export function IconTarget({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
      <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2"/>
      <circle cx="12" cy="12" r="2" fill={color}/>
    </svg>
  )
}

export function IconWhistle({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M2 8h4l2 2 6-4.5 2 .5 1 3-6 4.5-1 1H6L4 12H2l-1-2 1-2z" stroke={color} strokeWidth="2" strokeLinejoin="round" transform="translate(3, 3) scale(0.85)"/>
      <circle cx="18" cy="7" r="2" fill={color}/>
      <path d="M18 9v3" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconArrowLeft({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M15 18l-6-6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconSettings({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconEdit({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// --- Role icons (for player positions) ---

export function IconShieldRole({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3L4 7v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V7l-8-4z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M12 8v4M10 10h4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconBrain({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2a5 5 0 00-4.9 4A4 4 0 004 10a4 4 0 001.2 7.5A5 5 0 0012 22a5 5 0 006.8-4.5A4 4 0 0020 10a4 4 0 00-3.1-3.9A5 5 0 0012 2z" stroke={color} strokeWidth="1.8"/>
      <path d="M12 2v20" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" opacity="0.5"/>
    </svg>
  )
}

export function IconWind({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M2 12h15.5a3.5 3.5 0 001.7-6.6M2 17h10.5a3.5 3.5 0 010 7H2M2 7h8.5a3.5 3.5 0 000-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconWand({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M15 4l-2.5 2.5M4 15l11-11 4 4-11 11-5 1 1-5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 2l1.5 1.5L18 5l-1.5-1.5L18 2z" fill={color} opacity="0.6"/>
      <path d="M5 3l1 1-1 1-1-1 1-1z" fill={color} opacity="0.4"/>
    </svg>
  )
}

export function IconMuscle({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 12c0-4 2-7 4-8s4 0 5 2c1-2 3-3 5-2s4 4 4 8c0 5-4 9-9 9s-9-4-9-9z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M9 15c1.5 1 4.5 1 6 0" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconLink({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconLock({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="2"/>
      <path d="M8 11V7a4 4 0 018 0v4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconUnlock({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="2"/>
      <path d="M8 11V7a4 4 0 017.87-.8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconMedal({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="15" r="6" stroke={color} strokeWidth="2"/>
      <path d="M8.5 2h7L18 8l-6 3-6-3 2.5-6z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M12 11v-2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconComment({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconClipboard({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke={color} strokeWidth="2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" stroke={color} strokeWidth="2"/>
    </svg>
  )
}

export function IconThumbsUp({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 22V11l3.4-8.5A1.5 1.5 0 0112 2v0a1 1 0 011 1v7h5.6a2 2 0 012 2.3l-1.4 8A2 2 0 0117.2 22H7z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M2 13v9h3V11H2v2z" fill={color} opacity="0.3"/>
    </svg>
  )
}

export function IconPitch({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="3" width="20" height="18" rx="1" stroke={color} strokeWidth="1.5"/>
      <line x1="12" y1="3" x2="12" y2="21" stroke={color} strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5"/>
    </svg>
  )
}

export function IconBell({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconLogout({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="16 17 21 12 16 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconGroup2({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.5"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconSearch({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="11" cy="11" r="8" stroke={color} strokeWidth="1.5"/>
      <path d="m21 21-4.35-4.35" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconRefresh({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M23 4v6h-6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 20v-6h6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconMedalGold({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="14" r="7" fill="#FFD700" opacity="0.2" stroke="#FFD700" strokeWidth="1.5"/>
      <path d="M12 10v5m-2-3h4" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 2l4 6 4-6" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconMedalSilver({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="14" r="7" fill="#c0c0c0" opacity="0.2" stroke="#c0c0c0" strokeWidth="1.5"/>
      <path d="M10 12a2 2 0 1 1 2 2h-2v2h4" stroke="#c0c0c0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 2l4 6 4-6" stroke="#c0c0c0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconMedalBronze({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="14" r="7" fill="#cd7f32" opacity="0.2" stroke="#cd7f32" strokeWidth="1.5"/>
      <path d="M10 11a2 2 0 1 1 2 2 2 2 0 1 1-2 2" stroke="#cd7f32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 2l4 6 4-6" stroke="#cd7f32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
