import { describe, it, expect } from 'vitest'
import {
  categoryToSkills,
  skillsToCategory,
  categoriesToSkills,
  skillsToCategories,
  isCategoryCustomized,
  CATEGORY_SKILLS,
} from './rating-utils'
import type { SkillKey, CategoryKey } from './rating-utils'

function makeSkills(val = 5): Record<SkillKey, number> {
  const all = Object.values(CATEGORY_SKILLS).flat() as SkillKey[]
  return Object.fromEntries(all.map(k => [k, val])) as Record<SkillKey, number>
}

describe('categoryToSkills', () => {
  it('sets all fisica skills to the given value', () => {
    const result = categoryToSkills('fisica', 7)
    expect(result).toEqual({ velocita: 7, resistenza: 7, forza: 7, salto: 7, agilita: 7 })
  })
  it('sets all attacco skills (only 2) to value', () => {
    const result = categoryToSkills('attacco', 9)
    expect(result).toEqual({ finalizzazione: 9, assist_making: 9 })
  })
})

describe('skillsToCategory', () => {
  it('returns exact value when all skills are uniform', () => {
    expect(skillsToCategory(makeSkills(7), 'fisica')).toBe(7)
  })
  it('returns average rounded to 1 decimal', () => {
    const skills = makeSkills(5)
    // fisica: 8 + 6 + 7 + 5 + 4 = 30 / 5 = 6.0
    skills.velocita = 8; skills.resistenza = 6; skills.forza = 7; skills.salto = 5; skills.agilita = 4
    expect(skillsToCategory(skills, 'fisica')).toBe(6)
  })
  it('rounds to 1 decimal place', () => {
    const skills = makeSkills(5)
    // tattica has 4 skills: 7+8+6+6 = 27 / 4 = 6.75 → rounds to 6.8
    skills.lettura_gioco = 7; skills.posizionamento = 8; skills.pressing = 6; skills.costruzione = 6
    expect(skillsToCategory(skills, 'tattica')).toBe(6.8)
  })
})

describe('categoriesToSkills', () => {
  it('spreads each category value to its skills', () => {
    const cats: Record<CategoryKey, number> = {
      fisica: 7, tecnica: 8, tattica: 6, difesa: 5, attacco: 9, mentalita: 4,
    }
    const result = categoriesToSkills(cats)
    expect(result.velocita).toBe(7)
    expect(result.tecnica_palla).toBe(8)
    expect(result.lettura_gioco).toBe(6)
    expect(result.marcatura).toBe(5)
    expect(result.finalizzazione).toBe(9)
    expect(result.leadership).toBe(4)
  })
})

describe('skillsToCategories', () => {
  it('computes averages for all categories', () => {
    const result = skillsToCategories(makeSkills(6))
    const keys: CategoryKey[] = ['fisica', 'tecnica', 'tattica', 'difesa', 'attacco', 'mentalita']
    for (const k of keys) expect(result[k]).toBe(6)
  })
})

describe('isCategoryCustomized', () => {
  it('returns false when all skills in category are equal', () => {
    expect(isCategoryCustomized(makeSkills(7), 'fisica')).toBe(false)
  })
  it('returns true when any skill differs', () => {
    const skills = makeSkills(7)
    skills.velocita = 9
    expect(isCategoryCustomized(skills, 'fisica')).toBe(true)
  })
  it('returns false even with different values across OTHER categories', () => {
    const skills = makeSkills(5)
    skills.finalizzazione = 9  // attacco, not fisica
    expect(isCategoryCustomized(skills, 'fisica')).toBe(false)
  })
})
