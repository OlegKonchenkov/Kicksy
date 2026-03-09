// Shared XP / Level system — used by both client (XPBar) and server (actions)

export const LEVELS = [
  { level: 1, name: 'Pivetto',        xp: 0     },
  { level: 2, name: 'Jolly',          xp: 150   },
  { level: 3, name: 'Titolare',       xp: 400   },
  { level: 4, name: 'Veterano',       xp: 800   },
  { level: 5, name: 'Capitano',       xp: 1500  },
  { level: 6, name: 'Bandiera',       xp: 3000  },
  { level: 7, name: 'Fenomeno',       xp: 6000  },
  { level: 8, name: "Pallone d'Oro",  xp: 12000 },
] as const

export type LevelEntry = typeof LEVELS[number]

/** Returns the current level entry and optional next level entry for a given XP total */
export function getLevelInfo(xp: number): {
  current: LevelEntry
  next: LevelEntry | null
  progress: number   // 0–100
} {
  let current: LevelEntry = LEVELS[0]
  let next: LevelEntry | null = null

  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i]
      next = (LEVELS[i + 1] as LevelEntry | undefined) ?? null
    }
  }

  const progress = next
    ? Math.min(100, ((xp - current.xp) / (next.xp - current.xp)) * 100)
    : 100

  return { current, next, progress }
}

/** Returns the numeric level (1–8) for a given XP total */
export function getLevelNumber(xp: number): number {
  return getLevelInfo(xp).current.level
}

// ─── XP reward constants ──────────────────────────────────────────────────

export const XP_REWARDS = {
  PARTICIPATION:  5,   // just showing up
  WIN:           50,
  DRAW:          20,
  LOSS:          10,
  MVP:           30,
} as const

/** Calculate XP for a single player given their match outcome */
export function calcMatchXP(opts: {
  outcome: 'win' | 'draw' | 'loss' | 'participation'
  isMVP: boolean
}): number {
  const { outcome, isMVP } = opts
  let xp = XP_REWARDS.PARTICIPATION
  if (outcome === 'win')   xp += XP_REWARDS.WIN
  if (outcome === 'draw')  xp += XP_REWARDS.DRAW
  if (outcome === 'loss')  xp += XP_REWARDS.LOSS
  if (isMVP)               xp += XP_REWARDS.MVP
  return xp
}
