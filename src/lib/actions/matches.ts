'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AsyncResult, Match, MatchRegistration, MatchResult } from '@/types'
import { calcMatchXP, getLevelInfo, getLevelNumber } from '@/lib/xp'

/* ─── Fetch ─────────────────────────────────────────────────────────────── */

export async function getGroupMatches(groupId: string): Promise<AsyncResult<Array<
  Match & { registrationCount: number; myRegistration: MatchRegistration | null }
>>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const [matchesRes, regsRes] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .eq('group_id', groupId)
      .order('scheduled_at', { ascending: false }),
    supabase
      .from('match_registrations')
      .select('*')
      .in('match_id', (
        await supabase
          .from('matches')
          .select('id')
          .eq('group_id', groupId)
      ).data?.map(m => m.id) ?? []),
  ])

  if (matchesRes.error) return { data: null, error: matchesRes.error.message }

  const matches = matchesRes.data ?? []
  const allRegs = regsRes.data ?? []

  return {
    data: matches.map(m => {
      const matchRegs = allRegs.filter(r => r.match_id === m.id)
      const confirmedCount = matchRegs.filter(r => r.status === 'confirmed').length
      const myReg = matchRegs.find(r => r.user_id === user.id) ?? null
      return {
        ...m,
        status: m.status as Match['status'],
        registration_deadline: m.registration_deadline,
        registrationCount: confirmedCount,
        myRegistration: myReg ? { ...myReg, status: myReg.status as MatchRegistration['status'] } : null,
      }
    }),
    error: null,
  }
}

export async function getMatchDetails(matchId: string): Promise<AsyncResult<{
  match: Match
  registrations: Array<MatchRegistration & {
    profile: { username: string; full_name: string | null; avatar_url: string | null }
  }>
  result: MatchResult | null
  myRegistration: MatchRegistration | null
}>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const [matchRes, regsRes, resultRes] = await Promise.all([
    supabase.from('matches').select('*').eq('id', matchId).single(),
    supabase
      .from('match_registrations')
      .select('*, profiles(username, full_name, avatar_url)')
      .eq('match_id', matchId)
      .eq('status', 'confirmed'),
    supabase.from('match_results').select('*').eq('match_id', matchId).maybeSingle(),
  ])

  if (matchRes.error) return { data: null, error: 'Partita non trovata' }

  const myRegRes = await supabase
    .from('match_registrations')
    .select('*')
    .eq('match_id', matchId)
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    data: {
      match: { ...matchRes.data, status: matchRes.data.status as Match['status'] },
      registrations: (regsRes.data ?? []).map(r => ({
        ...r,
        status: r.status as MatchRegistration['status'],
        profile: r.profiles as unknown as { username: string; full_name: string | null; avatar_url: string | null },
      })),
      result: resultRes.data ?? null,
      myRegistration: myRegRes.data
        ? { ...myRegRes.data, status: myRegRes.data.status as MatchRegistration['status'] }
        : null,
    },
    error: null,
  }
}

/* ─── Mutations ─────────────────────────────────────────────────────────── */

export async function createMatch(groupId: string, data: {
  title: string
  scheduled_at: string
  location?: string | null
  description?: string | null
  max_players?: number
  min_players?: number
  team_size?: number
  status?: Match['status']
  registration_deadline?: string | null
}): Promise<AsyncResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: match, error } = await supabase
    .from('matches')
    .insert({
      group_id: groupId,
      title: data.title,
      scheduled_at: data.scheduled_at,
      location: data.location ?? null,
      description: data.description ?? null,
      max_players: data.max_players ?? 10,
      min_players: data.min_players ?? 6,
      team_size: data.team_size ?? 5,
      status: data.status ?? 'open',
      registration_deadline: data.registration_deadline ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath(`/groups/${groupId}`)
  return { data: { id: match.id }, error: null }
}

export async function updateMatch(matchId: string, updates: {
  title?: string
  scheduled_at?: string
  location?: string | null
  description?: string | null
  max_players?: number
  min_players?: number
  team_size?: number
  status?: Match['status']
  registration_deadline?: string | null
}): Promise<AsyncResult<true>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('matches')
    .update(updates)
    .eq('id', matchId)

  if (error) return { data: null, error: error.message }
  revalidatePath(`/matches/${matchId}`)
  return { data: true, error: null }
}

export async function deleteMatch(matchId: string): Promise<AsyncResult<true>> {
  const supabase = await createClient()

  const { data: matchData, error: matchErr } = await supabase
    .from('matches')
    .select('group_id')
    .eq('id', matchId)
    .single()

  if (matchErr) return { data: null, error: 'Partita non trovata' }

  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId)

  if (error) return { data: null, error: error.message }
  revalidatePath(`/groups/${matchData.group_id}/matches`)
  revalidatePath(`/matches/${matchId}`)
  return { data: true, error: null }
}

export async function registerForMatch(matchId: string): Promise<AsyncResult<{ status: MatchRegistration['status'] }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  // Check current confirmed count
  const [matchRes, countRes] = await Promise.all([
    supabase.from('matches').select('max_players, status').eq('id', matchId).single(),
    supabase
      .from('match_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', matchId)
      .eq('status', 'confirmed'),
  ])

  if (matchRes.error) return { data: null, error: 'Partita non trovata' }
  if (matchRes.data.status !== 'open') return { data: null, error: 'Le iscrizioni sono chiuse' }

  const confirmedCount = countRes.count ?? 0
  const status: MatchRegistration['status'] = confirmedCount < matchRes.data.max_players ? 'confirmed' : 'waitlist'

  // Upsert registration
  const { error } = await supabase
    .from('match_registrations')
    .upsert({ match_id: matchId, user_id: user.id, status }, { onConflict: 'match_id,user_id' })

  if (error) return { data: null, error: error.message }
  revalidatePath(`/matches/${matchId}`)
  return { data: { status }, error: null }
}

export async function unregisterFromMatch(matchId: string): Promise<AsyncResult<true>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { error } = await supabase
    .from('match_registrations')
    .delete()
    .eq('match_id', matchId)
    .eq('user_id', user.id)

  if (error) return { data: null, error: error.message }
  revalidatePath(`/matches/${matchId}`)
  return { data: true, error: null }
}

export type MatchResultPayload = {
  leveledUp: boolean
  newLevel: number
  levelName: string
  xpGained: number
  oldXP: number
}

type MatchPlayerStatInput = {
  user_id: string
  goals: number
  assists: number
}

async function recomputeGoalAssistStatsForUsers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  userIds: string[],
) {
  if (userIds.length === 0) return

  const { data: playedMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('group_id', groupId)
    .eq('status', 'played')

  const playedIds = (playedMatches ?? []).map((m) => m.id)
  if (playedIds.length === 0) {
    await Promise.allSettled(
      userIds.map((uid) =>
        supabase
          .from('player_stats')
          .upsert(
            { user_id: uid, group_id: groupId, goals_scored: 0, assists: 0 },
            { onConflict: 'user_id,group_id', ignoreDuplicates: false },
          ),
      ),
    )
    return
  }

  const { data: rows } = await supabase
    .from('match_player_stats')
    .select('user_id, goals, assists')
    .in('user_id', userIds)
    .in('match_id', playedIds)

  const agg = new Map<string, { goals: number; assists: number }>()
  for (const uid of userIds) agg.set(uid, { goals: 0, assists: 0 })
  for (const row of rows ?? []) {
    const current = agg.get(row.user_id) ?? { goals: 0, assists: 0 }
    current.goals += Number(row.goals ?? 0)
    current.assists += Number(row.assists ?? 0)
    agg.set(row.user_id, current)
  }

  const updates = Array.from(agg.entries()).map(([uid, v]) =>
    supabase
      .from('player_stats')
      .upsert(
        {
          user_id: uid,
          group_id: groupId,
          goals_scored: v.goals,
          assists: v.assists,
        },
        { onConflict: 'user_id,group_id', ignoreDuplicates: false },
      )
  )
  await Promise.allSettled(updates)
}

export async function upsertMatchPlayerStats(
  matchId: string,
  stats: MatchPlayerStatInput[],
): Promise<AsyncResult<true>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: matchRow, error: matchErr } = await supabase
    .from('matches')
    .select('id, group_id, status')
    .eq('id', matchId)
    .single()
  if (matchErr || !matchRow) return { data: null, error: 'Partita non trovata' }

  const { data: memberRow } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', matchRow.group_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!memberRow) return { data: null, error: 'Non autorizzato' }

  const isAdmin = memberRow.role === 'admin'
  if (!isAdmin) {
    if (stats.length !== 1 || stats[0].user_id !== user.id) {
      return { data: null, error: 'Puoi modificare solo le tue statistiche' }
    }
  }

  const payload = stats.map((s) => ({
    match_id: matchId,
    user_id: s.user_id,
    goals: Math.max(0, Math.floor(Number(s.goals || 0))),
    assists: Math.max(0, Math.floor(Number(s.assists || 0))),
  }))

  const { error } = await supabase
    .from('match_player_stats')
    .upsert(payload, { onConflict: 'match_id,user_id', ignoreDuplicates: false })
  if (error) return { data: null, error: error.message }

  await recomputeGoalAssistStatsForUsers(
    supabase,
    matchRow.group_id,
    Array.from(new Set(payload.map((p) => p.user_id))),
  )

  revalidatePath(`/matches/${matchId}`)
  revalidatePath('/profile')
  revalidatePath('/rankings')
  revalidatePath(`/groups/${matchRow.group_id}/rankings`)
  return { data: true, error: null }
}

export async function submitMatchResult(matchId: string, data: {
  team1_score: number
  team2_score: number
  mvp_user_id?: string | null
  notes?: string | null
  playerStats?: MatchPlayerStatInput[]
}): Promise<AsyncResult<MatchResultPayload>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  // 1. Insert result
  const { error: resultErr } = await supabase
    .from('match_results')
    .insert({
      match_id: matchId,
      created_by: user.id,
      team1_score: data.team1_score,
      team2_score: data.team2_score,
      mvp_user_id: data.mvp_user_id ?? null,
      notes: data.notes ?? null,
    })

  if (resultErr) return { data: null, error: resultErr.message }

  // 2. Mark match as played + get group_id
  const { data: matchData } = await supabase
    .from('matches')
    .update({ status: 'played' })
    .eq('id', matchId)
    .select('group_id')
    .single()

  const groupId: string | undefined = matchData?.group_id

  // 3. Get confirmed registrations + generated teams
  const [regsRes, teamsRes] = await Promise.all([
    supabase
      .from('match_registrations')
      .select('user_id, team_id')
      .eq('match_id', matchId)
      .eq('status', 'confirmed'),
    supabase
      .from('generated_teams')
      .select('team1_user_ids, team2_user_ids')
      .eq('match_id', matchId)
      .eq('is_confirmed', true)
      .maybeSingle(),
  ])

  const registrations = regsRes.data ?? []
  const teams = teamsRes.data

  // 4. Determine team membership for each player
  const team1Ids = new Set<string>(teams?.team1_user_ids ?? [])
  const team2Ids = new Set<string>(teams?.team2_user_ids ?? [])

  const { team1_score: s1, team2_score: s2, mvp_user_id: mvpId } = data
  const isDraw = s1 === s2

  function getOutcome(userId: string): 'win' | 'draw' | 'loss' | 'participation' {
    if (!teams) return 'participation'
    if (team1Ids.has(userId)) {
      if (isDraw) return 'draw'
      return s1 > s2 ? 'win' : 'loss'
    }
    if (team2Ids.has(userId)) {
      if (isDraw) return 'draw'
      return s2 > s1 ? 'win' : 'loss'
    }
    return 'participation'
  }

  // 5. Award XP + update player_stats for each participant
  const profileUpdates: Promise<unknown>[] = []

  for (const reg of registrations) {
    const uid = reg.user_id
    const outcome = getOutcome(uid)
    const isMVP = mvpId === uid
    const xpGain = calcMatchXP({ outcome, isMVP })

    const isWin   = outcome === 'win'
    const isDraw_ = outcome === 'draw'
    const isLoss  = outcome === 'loss'

    // Upsert player_stats
    if (groupId) {
      profileUpdates.push(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).rpc('increment_player_stats', {
          p_user_id:     uid,
          p_group_id:    groupId,
          p_played:      1,
          p_won:         isWin  ? 1 : 0,
          p_drawn:       isDraw_ ? 1 : 0,
          p_lost:        isLoss ? 1 : 0,
          p_mvp:         isMVP ? 1 : 0,
          p_xp:          xpGain,
        }).catch(() => {
          // Fallback: manual upsert if RPC not available
          return supabase
            .from('player_stats')
            .upsert({
              user_id:       uid,
              group_id:      groupId,
              matches_played: 1,
              matches_won:   isWin  ? 1 : 0,
              matches_drawn: isDraw_ ? 1 : 0,
              matches_lost:  isLoss ? 1 : 0,
              mvp_count:     isMVP ? 1 : 0,
              xp_from_matches: xpGain,
            }, { onConflict: 'user_id,group_id', ignoreDuplicates: false })
        })
      )
    }

    // Increment profile XP
    profileUpdates.push(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc('increment_profile_xp', { p_user_id: uid, p_xp: xpGain }).catch(async () => {
        // Fallback: read-then-write
        const { data: prof } = await supabase
          .from('profiles')
          .select('xp')
          .eq('id', uid)
          .single()
        const newXP = (prof?.xp ?? 0) + xpGain
        const newLevel = getLevelNumber(newXP)
        return supabase
          .from('profiles')
          .update({ xp: newXP, level: newLevel })
          .eq('id', uid)
      })
    )
  }

  await Promise.allSettled(profileUpdates)

  // 6. Get caller's XP before + after for level-up detection
  const myXPBefore = (() => {
    // We saved nothing before — use a secondary query
    return 0
  })()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('xp, level')
    .eq('id', user.id)
    .single()

  const myReg = registrations.find(r => r.user_id === user.id)
  const myOutcome = myReg ? getOutcome(user.id) : 'participation'
  const myIsMVP = mvpId === user.id
  const myXPGained = calcMatchXP({ outcome: myOutcome, isMVP: myIsMVP })
  const xpBeforeThisMatch = (myProfile?.xp ?? 0) - myXPGained
  const oldLevel = getLevelNumber(Math.max(0, xpBeforeThisMatch))
  const newLevel = myProfile?.level ?? 1
  const leveledUp = newLevel > oldLevel
  const { current: levelEntry } = getLevelInfo(myProfile?.xp ?? 0)

  if ((data.playerStats ?? []).length > 0 && groupId) {
    const statsPayload = (data.playerStats ?? []).map((s) => ({
      match_id: matchId,
      user_id: s.user_id,
      goals: Math.max(0, Math.floor(Number(s.goals || 0))),
      assists: Math.max(0, Math.floor(Number(s.assists || 0))),
    }))

    const { error: statsErr } = await supabase
      .from('match_player_stats')
      .upsert(statsPayload, { onConflict: 'match_id,user_id', ignoreDuplicates: false })

    if (!statsErr) {
      await recomputeGoalAssistStatsForUsers(
        supabase,
        groupId,
        Array.from(new Set(statsPayload.map((p) => p.user_id))),
      )
    }
  }

  revalidatePath(`/matches/${matchId}`)
  revalidatePath('/profile')
  revalidatePath('/rankings')

  return {
    data: {
      leveledUp,
      newLevel,
      levelName: levelEntry.name,
      xpGained: myXPGained,
      oldXP: Math.max(0, xpBeforeThisMatch),
    },
    error: null,
  }
}

export async function lockMatch(matchId: string): Promise<AsyncResult<true>> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('matches')
    .update({ status: 'locked' })
    .eq('id', matchId)

  if (error) return { data: null, error: error.message }
  revalidatePath(`/matches/${matchId}`)
  return { data: true, error: null }
}

export async function openMatch(matchId: string): Promise<AsyncResult<true>> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('matches')
    .update({ status: 'open' })
    .eq('id', matchId)

  if (error) return { data: null, error: error.message }
  revalidatePath(`/matches/${matchId}`)
  return { data: true, error: null }
}

// ─── Ratings ─────────────────────────────────────────────────────────────

type SkillRatings = {
  velocita: number; resistenza: number; forza: number; salto: number; agilita: number
  tecnica_palla: number; dribbling: number; passaggio: number; tiro: number; colpo_di_testa: number
  lettura_gioco: number; posizionamento: number; pressing: number; costruzione: number
  marcatura: number; tackle: number; intercettamento: number; copertura: number
  finalizzazione: number; assist_making: number
  leadership: number; comunicazione: number; mentalita_competitiva: number; fair_play: number
}

const XP_PER_PEER_RATING = 12

async function awardProfileXP(userId: string, xpGain: number) {
  if (xpGain <= 0) return
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpcRes = await (supabase as any).rpc('increment_profile_xp', { p_user_id: userId, p_xp: xpGain })
  if (!rpcRes.error) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', userId)
    .single()

  const newXP = (profile?.xp ?? 0) + xpGain
  const newLevel = getLevelNumber(newXP)
  await supabase
    .from('profiles')
    .update({ xp: newXP, level: newLevel })
    .eq('id', userId)
}

export async function submitRatings(
  matchId: string,
  groupId: string,
  ratings: Array<{ rateeId: string; skills: SkillRatings }>
): Promise<AsyncResult<true>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const rateeIds = ratings.map((r) => r.rateeId)
  const { data: existing } = await supabase
    .from('player_ratings')
    .select('ratee_id')
    .eq('rater_id', user.id)
    .eq('group_id', groupId)
    .eq('match_id', matchId)
    .in('ratee_id', rateeIds)

  const existingRateeIds = new Set((existing ?? []).map((r) => r.ratee_id))
  const newlyRatedCount = rateeIds.filter((id) => !existingRateeIds.has(id)).length

  const inserts = ratings.map(r => ({
    rater_id: user.id,
    ratee_id: r.rateeId,
    group_id: groupId,
    match_id: matchId,
    ...r.skills,
  }))

  const { error } = await supabase
    .from('player_ratings')
    .upsert(inserts, { onConflict: 'rater_id,ratee_id,match_id', ignoreDuplicates: false })

  if (error) return { data: null, error: error.message }
  await awardProfileXP(user.id, newlyRatedCount * XP_PER_PEER_RATING)
  revalidatePath(`/matches/${matchId}`)
  revalidatePath('/profile')
  return { data: true, error: null }
}

export async function submitGroupRatings(
  groupId: string,
  ratings: Array<{ rateeId: string; skills: SkillRatings }>
): Promise<AsyncResult<true>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const rateeIds = ratings.map((r) => r.rateeId)
  const { data: existing } = await supabase
    .from('player_ratings')
    .select('ratee_id')
    .eq('rater_id', user.id)
    .eq('group_id', groupId)
    .is('match_id', null)
    .in('ratee_id', rateeIds)

  const existingRateeIds = new Set((existing ?? []).map((r) => r.ratee_id))
  const newlyRatedCount = rateeIds.filter((id) => !existingRateeIds.has(id)).length

  const inserts = ratings.map(r => ({
    rater_id: user.id,
    ratee_id: r.rateeId,
    group_id: groupId,
    match_id: null,
    ...r.skills,
  }))

  const { error } = await supabase
    .from('player_ratings')
    .upsert(inserts, { onConflict: 'rater_id,ratee_id,group_id,match_id', ignoreDuplicates: false })

  if (error) return { data: null, error: error.message }
  await awardProfileXP(user.id, newlyRatedCount * XP_PER_PEER_RATING)
  revalidatePath(`/groups/${groupId}/ratings`)
  revalidatePath(`/groups/${groupId}`)
  revalidatePath('/profile')
  return { data: true, error: null }
}
