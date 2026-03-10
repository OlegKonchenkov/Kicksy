export type SkillKey =
  | 'velocita' | 'resistenza' | 'forza' | 'salto' | 'agilita'
  | 'tecnica_palla' | 'dribbling' | 'passaggio' | 'tiro' | 'colpo_di_testa'
  | 'lettura_gioco' | 'posizionamento' | 'pressing' | 'costruzione'
  | 'marcatura' | 'tackle' | 'intercettamento' | 'copertura'
  | 'finalizzazione' | 'assist_making'
  | 'leadership' | 'comunicazione' | 'mentalita_competitiva' | 'fair_play'

export type CategoryKey = 'fisica' | 'tecnica' | 'tattica' | 'difesa' | 'attacco' | 'mentalita'

export const CATEGORY_SKILLS: Record<CategoryKey, SkillKey[]> = {
  fisica:    ['velocita', 'resistenza', 'forza', 'salto', 'agilita'],
  tecnica:   ['tecnica_palla', 'dribbling', 'passaggio', 'tiro', 'colpo_di_testa'],
  tattica:   ['lettura_gioco', 'posizionamento', 'pressing', 'costruzione'],
  difesa:    ['marcatura', 'tackle', 'intercettamento', 'copertura'],
  attacco:   ['finalizzazione', 'assist_making'],
  mentalita: ['leadership', 'comunicazione', 'mentalita_competitiva', 'fair_play'],
}

/** Given a category value (1–10), produce a partial skill map with all skills = value */
export function categoryToSkills(category: CategoryKey, value: number): Partial<Record<SkillKey, number>> {
  const result: Partial<Record<SkillKey, number>> = {}
  for (const skill of CATEGORY_SKILLS[category]) result[skill] = value
  return result
}

/** Average of all skills in a category, rounded to 1 decimal */
export function skillsToCategory(skills: Partial<Record<SkillKey, number>>, category: CategoryKey): number {
  const keys = CATEGORY_SKILLS[category]
  const sum = keys.reduce((acc, k) => acc + (skills[k] ?? 5), 0)
  return Math.round((sum / keys.length) * 10) / 10
}

/** Expand 6 category values into all 24 skills */
export function categoriesToSkills(cats: Record<CategoryKey, number>): Record<SkillKey, number> {
  const result: Partial<Record<SkillKey, number>> = {}
  for (const [cat, value] of Object.entries(cats) as [CategoryKey, number][]) {
    for (const skill of CATEGORY_SKILLS[cat]) result[skill] = value
  }
  return result as Record<SkillKey, number>
}

/** Compute category averages from a full 24-skill map */
export function skillsToCategories(skills: Partial<Record<SkillKey, number>>): Record<CategoryKey, number> {
  const result: Partial<Record<CategoryKey, number>> = {}
  for (const [cat, keys] of Object.entries(CATEGORY_SKILLS) as [CategoryKey, SkillKey[]][]) {
    const vals = keys.map(k => skills[k] ?? 5)
    result[cat] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  }
  return result as Record<CategoryKey, number>
}

/** True if any skill in a category differs from the others (user has customized it) */
export function isCategoryCustomized(skills: Partial<Record<SkillKey, number>>, category: CategoryKey): boolean {
  const keys = CATEGORY_SKILLS[category]
  const vals = keys.map(k => skills[k] ?? 5)
  return vals.some(v => v !== vals[0])
}
