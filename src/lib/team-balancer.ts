/**
 * Kicksy — Team Balancer
 * Role-constrained simulated annealing for balanced team generation.
 *
 * Algorithm:
 * 1. Compute each player's FIFA-style overall score (role-weighted macro averages)
 * 2. Apply Bayesian smoothing to overall scores
 * 3. Use simulated annealing to minimize |strength(A) - strength(B)|
 *    while respecting role distribution constraints
 */

import type { PlayerRole } from '@/types'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SkillSet {
  // Atletismo
  velocita: number
  resistenza: number
  forza: number
  salto: number
  agilita: number
  // Tecnica
  tecnica_palla: number
  dribbling: number
  passaggio: number
  tiro: number
  colpo_di_testa: number
  // Tattica
  lettura_gioco: number
  posizionamento: number
  pressing: number
  costruzione: number
  // Difesa
  marcatura: number
  tackle: number
  intercettamento: number
  copertura: number
  // Attacco
  finalizzazione: number
  assist_making: number
  // Mentalità
  leadership: number
  comunicazione: number
  mentalita_competitiva: number
  fair_play: number
}

export interface PlayerInput {
  id: string
  role: PlayerRole
  role2?: PlayerRole  // optional secondary preferred role
  skills: SkillSet
  /** Number of peer ratings received — used for Bayesian smoothing */
  ratingCount: number
}

export interface TeamBalanceResult {
  team1: string[]
  team2: string[]
  team1Strength: number
  team2Strength: number
  /** 0-100. 100 = perfectly balanced */
  balanceScore: number
  iterations: number
  algorithmVersion: string
}

type NeverTogetherPair = readonly [string, string]

// ─── Role-specific skill weights (normalized, sum = 100 per role) ─────────────

type RoleWeights = Record<keyof SkillSet, number>

const ROLE_WEIGHTS: Record<PlayerRole, Partial<RoleWeights>> = {
  // Defender: atletismo + difesa focused
  D: {
    velocita: 6, resistenza: 5, forza: 5, salto: 4, agilita: 4,
    tecnica_palla: 3, dribbling: 2, passaggio: 5, tiro: 1, colpo_di_testa: 4,
    lettura_gioco: 7, posizionamento: 8, pressing: 4, costruzione: 3,
    marcatura: 9, tackle: 9, intercettamento: 8, copertura: 8,
    finalizzazione: 1, assist_making: 2,
    leadership: 5, comunicazione: 4, mentalita_competitiva: 4, fair_play: 5,
  },
  // Midfielder: tattica + tecnica focused
  C: {
    velocita: 5, resistenza: 7, forza: 4, salto: 3, agilita: 5,
    tecnica_palla: 7, dribbling: 5, passaggio: 9, tiro: 5, colpo_di_testa: 3,
    lettura_gioco: 9, posizionamento: 8, pressing: 7, costruzione: 8,
    marcatura: 4, tackle: 5, intercettamento: 5, copertura: 4,
    finalizzazione: 4, assist_making: 6,
    leadership: 5, comunicazione: 5, mentalita_competitiva: 5, fair_play: 5,
  },
  // Winger: velocita + dribbling focused
  E: {
    velocita: 10, resistenza: 6, forza: 3, salto: 3, agilita: 8,
    tecnica_palla: 7, dribbling: 8, passaggio: 6, tiro: 6, colpo_di_testa: 3,
    lettura_gioco: 6, posizionamento: 6, pressing: 6, costruzione: 4,
    marcatura: 2, tackle: 3, intercettamento: 3, copertura: 3,
    finalizzazione: 6, assist_making: 7,
    leadership: 3, comunicazione: 4, mentalita_competitiva: 5, fair_play: 5,
  },
  // Trequartista: tecnica + creatività
  W: {
    velocita: 5, resistenza: 5, forza: 3, salto: 3, agilita: 7,
    tecnica_palla: 9, dribbling: 8, passaggio: 8, tiro: 7, colpo_di_testa: 3,
    lettura_gioco: 8, posizionamento: 7, pressing: 4, costruzione: 6,
    marcatura: 2, tackle: 2, intercettamento: 2, copertura: 2,
    finalizzazione: 7, assist_making: 8,
    leadership: 4, comunicazione: 5, mentalita_competitiva: 6, fair_play: 5,
  },
  // Attacker: finalizzazione + movimento
  A: {
    velocita: 8, resistenza: 5, forza: 5, salto: 5, agilita: 6,
    tecnica_palla: 7, dribbling: 7, passaggio: 5, tiro: 10, colpo_di_testa: 6,
    lettura_gioco: 6, posizionamento: 8, pressing: 5, costruzione: 3,
    marcatura: 1, tackle: 2, intercettamento: 2, copertura: 2,
    finalizzazione: 10, assist_making: 6,
    leadership: 4, comunicazione: 4, mentalita_competitiva: 7, fair_play: 5,
  },
}

const BAYESIAN_K = 5    // pseudo-count (prior strength)
const DEFAULT_MEAN = 5.5 // group mean fallback

// ─── Utility ─────────────────────────────────────────────────────────────────

function computeOverall(player: PlayerInput, groupMean: number): number {
  const weights = ROLE_WEIGHTS[player.role]
  const weightKeys = Object.keys(weights) as (keyof SkillSet)[]

  let totalWeight = 0
  let weightedSum = 0

  for (const skill of weightKeys) {
    const w = (weights[skill] ?? 0)
    const v = player.skills[skill] ?? 0
    weightedSum += w * v
    totalWeight += w
  }

  const rawOverall = totalWeight > 0 ? weightedSum / totalWeight : DEFAULT_MEAN

  // Bayesian smoothing: pull toward group mean when few ratings
  const { ratingCount: n } = player
  return (n * rawOverall + BAYESIAN_K * groupMean) / (n + BAYESIAN_K)
}

function computeGroupMean(players: PlayerInput[]): number {
  if (players.length === 0) return DEFAULT_MEAN
  const sum = players.reduce((acc, p) => {
    const w = ROLE_WEIGHTS[p.role]
    const keys = Object.keys(w) as (keyof SkillSet)[]
    let tw = 0, ws = 0
    for (const k of keys) {
      tw += w[k] ?? 0
      ws += (w[k] ?? 0) * (p.skills[k] ?? 0)
    }
    return acc + (tw > 0 ? ws / tw : DEFAULT_MEAN)
  }, 0)
  return sum / players.length
}

function teamStrength(ids: string[], overalls: Map<string, number>): number {
  return ids.reduce((acc, id) => acc + (overalls.get(id) ?? DEFAULT_MEAN), 0)
}

function balanceScore(diff: number, totalStrength: number): number {
  if (totalStrength === 0) return 100
  const normalized = diff / totalStrength
  return Math.max(0, Math.round((1 - normalized * 2) * 100))
}

function countNeverTogetherViolations(
  team1: string[],
  team2: string[],
  pairs: NeverTogetherPair[],
): number {
  if (pairs.length === 0) return 0
  const t1 = new Set(team1)
  const t2 = new Set(team2)
  let violations = 0
  for (const [a, b] of pairs) {
    if ((t1.has(a) && t1.has(b)) || (t2.has(a) && t2.has(b))) violations++
  }
  return violations
}

// ─── Role balance penalty ─────────────────────────────────────────────────

/**
 * Penalizes uneven role distribution across teams.
 * Groups: DEF={D,E}, MID={C,E}, ATT={A,W}
 * Returns penalty score (added to annealing cost).
 */
function computeRoleImbalancePenalty(
  team1: string[],
  team2: string[],
  roleMap: Map<string, PlayerRole>
): number {
  const groups: Array<{ roles: PlayerRole[] }> = [
    { roles: ['D', 'E'] },
    { roles: ['C', 'E'] },
    { roles: ['A', 'W'] },
  ]
  let penalty = 0
  for (const { roles } of groups) {
    const t1 = team1.filter(id => roles.includes(roleMap.get(id) ?? 'C')).length
    const t2 = team2.filter(id => roles.includes(roleMap.get(id) ?? 'C')).length
    const diff = Math.abs(t1 - t2)
    if (diff > 1) penalty += (diff - 1) * 30
  }
  return penalty
}

// ─── Main balancer ────────────────────────────────────────────────────────────

export function generateBalancedTeams(
  players: PlayerInput[],
  options: {
    maxIterations?: number
    initialTemperature?: number
    coolingRate?: number
    neverTogetherPairs?: NeverTogetherPair[]
  } = {}
): TeamBalanceResult {
  const {
    maxIterations = 1500,
    initialTemperature = 5.0,
    coolingRate = 0.995,
    neverTogetherPairs = [],
  } = options

  if (players.length < 2) {
    throw new Error('Servono almeno 2 giocatori per generare le squadre')
  }

  // 1. Compute overalls
  const groupMean = computeGroupMean(players)
  const overalls = new Map<string, number>()
  for (const p of players) {
    overalls.set(p.id, computeOverall(p, groupMean))
  }

  // Build role lookup map for role imbalance penalty
  const roleMap = new Map<string, PlayerRole>()
  for (const p of players) roleMap.set(p.id, p.role)

  const n = players.length
  const half = Math.floor(n / 2)
  const validIds = new Set(players.map((p) => p.id))
  const constraints = neverTogetherPairs.filter(([a, b]) => a !== b && validIds.has(a) && validIds.has(b))

  // 2. Greedy initial assignment (sorted snake draft)
  const sorted = [...players].sort(
    (a, b) => (overalls.get(b.id) ?? 0) - (overalls.get(a.id) ?? 0)
  )

  let team1: string[] = []
  let team2: string[] = []
  sorted.forEach((p, i) => {
    // snake: 0→T1, 1→T2, 2→T2, 3→T1, 4→T1, ...
    const round = Math.floor(i / 2)
    const posInRound = i % 2
    if (round % 2 === 0) {
      posInRound === 0 ? team1.push(p.id) : team2.push(p.id)
    } else {
      posInRound === 0 ? team2.push(p.id) : team1.push(p.id)
    }
  })

  let s1 = teamStrength(team1, overalls)
  let s2 = teamStrength(team2, overalls)
  let bestDiff = Math.abs(s1 - s2)
  let currentViolations = countNeverTogetherViolations(team1, team2, constraints)
  let bestViolations = currentViolations
  let bestT1 = [...team1]
  let bestT2 = [...team2]
  let bestRolePenalty = computeRoleImbalancePenalty(bestT1, bestT2, roleMap)

  // 3. Simulated annealing
  let temp = initialTemperature
  let iters = 0

  while (iters < maxIterations && (bestDiff > 0.01 || bestViolations > 0)) {
    // Pick a random player from each team and swap
    const i1 = Math.floor(Math.random() * team1.length)
    const i2 = Math.floor(Math.random() * team2.length)

    const id1 = team1[i1]
    const id2 = team2[i2]

    // Calculate new diff after swap
    const newS1 = s1 - (overalls.get(id1) ?? 0) + (overalls.get(id2) ?? 0)
    const newS2 = s2 - (overalls.get(id2) ?? 0) + (overalls.get(id1) ?? 0)
    const newDiff = Math.abs(newS1 - newS2)
    const currentRolePenalty = computeRoleImbalancePenalty(team1, team2, roleMap)
    team1[i1] = id2
    team2[i2] = id1
    const newViolations = countNeverTogetherViolations(team1, team2, constraints)
    const newRolePenalty = computeRoleImbalancePenalty(team1, team2, roleMap)
    const prevCost = Math.abs(s1 - s2) + currentViolations * 1000 + currentRolePenalty
    const newCost = newDiff + newViolations * 1000 + newRolePenalty

    const improved = newCost < prevCost
    const acceptProb = improved ? 1 : Math.exp(-(newCost - prevCost) / temp)

    if (Math.random() < acceptProb) {
      s1 = newS1
      s2 = newS2
      currentViolations = newViolations
    } else {
      team1[i1] = id1
      team2[i2] = id2
    }

    if (
      newViolations < bestViolations ||
      (newViolations === bestViolations && newRolePenalty < bestRolePenalty) ||
      (newViolations === bestViolations && newRolePenalty === bestRolePenalty && newDiff < bestDiff)
    ) {
      bestDiff = newDiff
      bestViolations = newViolations
      bestT1 = [...team1]
      bestT2 = [...team2]
      bestRolePenalty = newRolePenalty
    }

    temp *= coolingRate
    iters++
  }

  const finalS1 = teamStrength(bestT1, overalls)
  const finalS2 = teamStrength(bestT2, overalls)
  const total = finalS1 + finalS2

  return {
    team1: bestT1,
    team2: bestT2,
    team1Strength: Math.round(finalS1 * 10) / 10,
    team2Strength: Math.round(finalS2 * 10) / 10,
    balanceScore: balanceScore(Math.abs(finalS1 - finalS2), total),
    iterations: iters,
    algorithmVersion: '1.0',
  }
}

// ─── Player FIFA overall (for display) ──────────────────────────────────────

export function getPlayerOverall(player: PlayerInput): number {
  const groupMean = DEFAULT_MEAN
  return Math.round(computeOverall(player, groupMean) * 10)
}

export function getPlayerOverallWithContext(
  player: PlayerInput,
  allPlayers: PlayerInput[]
): number {
  const mean = computeGroupMean(allPlayers)
  return Math.round(computeOverall(player, mean) * 10)
}
