import { describe, it, expect } from 'vitest'
import { generateBalancedTeams, getPlayerOverall, type PlayerInput } from './team-balancer'

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
