import { describe, it, expect } from 'vitest'
import { generateBalancedTeams, getPlayerOverall, computeRoleImbalancePenalty, type PlayerInput } from './team-balancer'
import type { PlayerRole } from '@/types'

function makePlayer(id: string, role: PlayerInput['role'], skill = 5): PlayerInput {
  return {
    id,
    role,
    ratingCount: 10,
    skills: {
      velocita: skill, resistenza: skill, forza: skill, salto: skill, agilita: skill,
      tecnica_palla: skill, dribbling: skill, passaggio: skill, tiro: skill, colpo_di_testa: skill,
      lettura_gioco: skill, posizionamento: skill, pressing: skill, costruzione: skill,
      marcatura: skill, tackle: skill, intercettamento: skill, copertura: skill,
      finalizzazione: skill, assist_making: skill,
      leadership: skill, comunicazione: skill, mentalita_competitiva: skill, fair_play: skill,
    },
  }
}

describe('generateBalancedTeams', () => {
  it('splits 10 equal players into two equal teams', () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer(`p${i}`, 'C', 5)
    )
    const result = generateBalancedTeams(players, { maxIterations: 500 })

    expect(result.team1.length + result.team2.length).toBe(10)
    expect(result.team1.length).toBe(5)
    expect(result.team2.length).toBe(5)
    expect(result.balanceScore).toBeGreaterThanOrEqual(90)
  })

  it('returns correct structure', () => {
    const players = [makePlayer('a', 'A'), makePlayer('b', 'D'), makePlayer('c', 'C'), makePlayer('d', 'E')]
    const result = generateBalancedTeams(players, { maxIterations: 200 })

    expect(result).toHaveProperty('team1')
    expect(result).toHaveProperty('team2')
    expect(result).toHaveProperty('team1Strength')
    expect(result).toHaveProperty('team2Strength')
    expect(result).toHaveProperty('balanceScore')
    expect(result.algorithmVersion).toBe('1.0')
  })

  it('throws when fewer than 2 players', () => {
    expect(() => generateBalancedTeams([makePlayer('a', 'A')])).toThrow()
  })

  it('produces better balance for mixed-skill teams after annealing', () => {
    const players = [
      makePlayer('star', 'A', 10),
      makePlayer('good1', 'C', 8),
      makePlayer('good2', 'D', 7),
      makePlayer('avg1',  'E', 5),
      makePlayer('avg2',  'W', 5),
      makePlayer('weak1', 'C', 3),
    ]
    const result = generateBalancedTeams(players, { maxIterations: 1000 })
    // Balance score should be reasonable (not perfectly split but better than random)
    expect(result.balanceScore).toBeGreaterThanOrEqual(50)
    expect(Math.abs(result.team1Strength - result.team2Strength)).toBeLessThan(10)
  })
})

describe('getPlayerOverall', () => {
  it('returns a number between 10 and 100', () => {
    const p = makePlayer('x', 'C', 7)
    const overall = getPlayerOverall(p)
    expect(overall).toBeGreaterThanOrEqual(10)
    expect(overall).toBeLessThanOrEqual(100)
  })

  it('higher-skilled player gets higher overall', () => {
    const high = makePlayer('h', 'A', 9)
    const low  = makePlayer('l', 'A', 3)
    expect(getPlayerOverall(high)).toBeGreaterThan(getPlayerOverall(low))
  })
})

describe('computeRoleImbalancePenalty', () => {
  it('returns 0 when both teams have balanced role distribution', () => {
    const roleMap = new Map<string, PlayerRole>([
      ['a', 'D'], ['b', 'D'],
      ['c', 'C'], ['d', 'C'],
    ])
    expect(computeRoleImbalancePenalty(['a', 'c'], ['b', 'd'], roleMap)).toBe(0)
  })

  it('penalizes when all defenders on one team', () => {
    const roleMap = new Map<string, PlayerRole>([
      ['d1', 'D'], ['d2', 'D'], ['d3', 'D'],
      ['m1', 'C'], ['m2', 'C'], ['m3', 'C'],
    ])
    const penalty = computeRoleImbalancePenalty(
      ['d1', 'd2', 'd3'],
      ['m1', 'm2', 'm3'],
      roleMap
    )
    // DEF: |3-0|=3 → (3-1)*30=60; MID: |0-3|=3 → 60; ATT: 0
    expect(penalty).toBe(120)
  })

  it('reduces penalty when secondary role fills a group gap', () => {
    const roleMap = new Map<string, PlayerRole>([
      ['d1', 'D'], ['d2', 'D'], ['d3', 'D'],
      ['m1', 'C'], ['m2', 'C'], ['m3', 'C'],
    ])
    // d1 has secondary role C → counts in MID group too
    const role2Map = new Map<string, PlayerRole>([['d1', 'C']])

    const withoutRole2 = computeRoleImbalancePenalty(
      ['d1', 'd2', 'd3'], ['m1', 'm2', 'm3'], roleMap
    )
    const withRole2 = computeRoleImbalancePenalty(
      ['d1', 'd2', 'd3'], ['m1', 'm2', 'm3'], roleMap, role2Map
    )
    // With role2: MID: t1=1 (d1 via C), t2=3 → diff=2 → 30; total=90 < 120
    expect(withRole2).toBeLessThan(withoutRole2)
    expect(withRole2).toBe(90)
  })

  it('does not break when role2Map is empty', () => {
    const roleMap = new Map<string, PlayerRole>([['a', 'A'], ['b', 'D']])
    const role2Map = new Map<string, PlayerRole>()
    expect(() =>
      computeRoleImbalancePenalty(['a'], ['b'], roleMap, role2Map)
    ).not.toThrow()
  })
})
