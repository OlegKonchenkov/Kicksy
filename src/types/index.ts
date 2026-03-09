// Re-export all database types
export type {
  Database,
  Json,
  Profile,
  Group,
  GroupMember,
  Match,
  MatchRegistration,
  MatchResult,
  MatchPlayerStats,
  GeneratedTeam,
  PlayerStats,
  PlayerRating,
  MatchComment,
  MatchRecap,
  Badge,
  PlayerBadge,
  PlayerTitle,
  Poll,
  PollVote,
  Notification,
  PlayerRole,
  MemberRole,
  MatchStatus,
  RegistrationStatus,
  BadgeTier,
  NotificationType,
} from './database'

// App-level utility types

export type AsyncResult<T> = {
  data: T | null
  error: string | null
}

export type PaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** XP level descriptor */
export interface Level {
  level: number
  name: string
  xp: number
}

/** Macro skill category */
export type MacroCategory = 'atletismo' | 'tecnica' | 'tattica' | 'mentalita' | 'difesa' | 'attacco'

/** Macro category with weight and color */
export interface MacroConfig {
  key: MacroCategory
  label: string
  weight: number  // percentage (0-100)
  color: string   // CSS variable name
  skills: string[]
}

export const MACRO_CONFIG: MacroConfig[] = [
  {
    key: 'atletismo',
    label: 'Atletismo',
    weight: 18,
    color: 'var(--color-atletismo)',
    skills: ['velocita', 'resistenza', 'forza', 'salto', 'agilita'],
  },
  {
    key: 'tecnica',
    label: 'Tecnica',
    weight: 24,
    color: 'var(--color-tecnica)',
    skills: ['tecnica_palla', 'dribbling', 'passaggio', 'tiro', 'colpo_di_testa'],
  },
  {
    key: 'tattica',
    label: 'Tattica',
    weight: 19,
    color: 'var(--color-tattica)',
    skills: ['lettura_gioco', 'posizionamento', 'pressing', 'costruzione'],
  },
  {
    key: 'difesa',
    label: 'Difesa',
    weight: 12,
    color: 'var(--color-difesa)',
    skills: ['marcatura', 'tackle', 'intercettamento', 'copertura'],
  },
  {
    key: 'attacco',
    label: 'Attacco',
    weight: 14,
    color: 'var(--color-attacco)',
    skills: ['finalizzazione', 'assist_making'],
  },
  {
    key: 'mentalita',
    label: 'Mentalità',
    weight: 13,
    color: 'var(--color-mentalita)',
    skills: ['leadership', 'comunicazione', 'mentalita_competitiva', 'fair_play'],
  },
]
