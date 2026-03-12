'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AsyncResult } from '@/types'

export async function getMyGroups(): Promise<AsyncResult<Array<{
  id: string
  name: string
  avatar_url: string | null
  sport_type: string
  role: 'admin' | 'member'
  memberCount: number
}>>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('group_members')
    .select('role, groups(id, name, avatar_url, sport_type)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (error) return { data: null, error: error.message }

  // Get member counts
  const groupIds = data.map(d => (d.groups as unknown as { id: string }).id)

  let countMap: Record<string, number> = {}
  if (groupIds.length > 0) {
    const { data: counts } = await supabase
      .from('group_members')
      .select('group_id')
      .in('group_id', groupIds)
      .eq('is_active', true)

    if (counts) {
      for (const row of counts) {
        countMap[row.group_id] = (countMap[row.group_id] ?? 0) + 1
      }
    }
  }

  const groups = data.map(d => {
    const g = d.groups as unknown as { id: string; name: string; avatar_url: string | null; sport_type: string }
    return {
      id: g.id,
      name: g.name,
      avatar_url: g.avatar_url,
      sport_type: g.sport_type,
      role: d.role as 'admin' | 'member',
      memberCount: countMap[g.id] ?? 0,
    }
  })

  return { data: groups, error: null }
}

export async function getGroupDetails(groupId: string): Promise<AsyncResult<{
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  sport_type: string
  invite_code: string
  invite_link_enabled: boolean
  max_members: number | null
  created_by: string
  myRole: 'admin' | 'member'
  isFounder: boolean
  members: Array<{
    user_id: string
    role: 'admin' | 'member'
    display_name: string | null
    is_active: boolean
    profile: {
      username: string
      full_name: string | null
      avatar_url: string | null
      xp: number
      level: number
    }
  }>
}>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const [groupRes, membersRes, myMemberRes] = await Promise.all([
    supabase.from('groups').select('*').eq('id', groupId).single(),
    supabase
      .from('group_members')
      .select('user_id, role, display_name, is_active, profiles(username, full_name, avatar_url, xp, level)')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('role', { ascending: true }),
    supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single(),
  ])

  if (groupRes.error) return { data: null, error: 'Gruppo non trovato' }
  if (myMemberRes.error) return { data: null, error: 'Non sei membro di questo gruppo' }

  const group = groupRes.data
  const members = (membersRes.data ?? []).map(m => ({
    user_id: m.user_id,
    role: m.role as 'admin' | 'member',
    display_name: m.display_name,
    is_active: m.is_active,
    profile: m.profiles as unknown as { username: string; full_name: string | null; avatar_url: string | null; xp: number; level: number },
  }))

  return {
    data: {
      id: group.id,
      name: group.name,
      description: group.description,
      avatar_url: group.avatar_url,
      sport_type: group.sport_type,
      invite_code: group.invite_code,
      invite_link_enabled: group.invite_link_enabled,
      max_members: group.max_members,
      created_by: group.created_by,
      myRole: myMemberRes.data.role as 'admin' | 'member',
      isFounder: group.created_by === user.id,
      members,
    },
    error: null,
  }
}

export async function updateGroupSettings(
  groupId: string,
  updates: {
    name?: string
    description?: string | null
    avatar_url?: string | null
    invite_link_enabled?: boolean
    max_members?: number | null
  }
): Promise<AsyncResult<true>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', groupId)

  if (error) return { data: null, error: error.message }
  revalidatePath(`/groups/${groupId}`)
  return { data: true, error: null }
}

export async function regenerateInviteCode(groupId: string): Promise<AsyncResult<string>> {
  const supabase = await createClient()

  // Generate a new random code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

  const { error } = await supabase
    .from('groups')
    .update({ invite_code: code })
    .eq('id', groupId)

  if (error) return { data: null, error: error.message }
  revalidatePath(`/groups/${groupId}`)
  return { data: code, error: null }
}

export async function removeMember(groupId: string, userId: string): Promise<AsyncResult<true>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('group_members')
    .update({ is_active: false })
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) return { data: null, error: error.message }
  revalidatePath(`/groups/${groupId}`)
  return { data: true, error: null }
}

export async function promoteMember(groupId: string, userId: string): Promise<AsyncResult<true>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('group_members')
    .update({ role: 'admin' })
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) return { data: null, error: error.message }
  revalidatePath(`/groups/${groupId}`)
  return { data: true, error: null }
}

export async function demoteMember(groupId: string, userId: string): Promise<AsyncResult<true>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: groupRow, error: groupErr } = await supabase
    .from('groups')
    .select('created_by')
    .eq('id', groupId)
    .single()

  if (groupErr || !groupRow) return { data: null, error: 'Gruppo non trovato' }
  if (groupRow.created_by !== user.id) return { data: null, error: 'Solo il fondatore puo revocare admin' }
  if (userId === groupRow.created_by) return { data: null, error: 'Il fondatore non puo essere declassato' }

  const { error } = await supabase
    .from('group_members')
    .update({ role: 'member' })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) return { data: null, error: error.message }
  revalidatePath(`/groups/${groupId}`)
  return { data: true, error: null }
}

export async function leaveGroup(groupId: string): Promise<AsyncResult<true>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { error } = await supabase
    .from('group_members')
    .update({ is_active: false })
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  if (error) return { data: null, error: error.message }
  revalidatePath('/groups')
  return { data: true, error: null }
}

export async function getGroupPollTemplateSettings(groupId: string): Promise<AsyncResult<Array<{
  template_id: string
  question_it: string
  is_enabled: boolean
  is_global: boolean
}>>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const [templatesRes, settingsRes] = await Promise.all([
    supabase
      .from('poll_templates')
      .select('id, question_it, is_global, group_id')
      .or(`is_global.eq.true,group_id.eq.${groupId}`),
    supabase
      .from('group_poll_template_settings')
      .select('template_id, is_enabled')
      .eq('group_id', groupId),
  ])

  if (templatesRes.error) return { data: null, error: templatesRes.error.message }

  const templates = (templatesRes.data ?? []) as Array<{
    id: string
    question_it: string
    is_global: boolean
  }>

  const settingsMap = new Map<string, boolean>()
  for (const s of settingsRes.data ?? []) settingsMap.set(s.template_id, s.is_enabled)

  const data = templates.map((t) => ({
    template_id: t.id,
    question_it: t.question_it,
    is_global: t.is_global,
    is_enabled: settingsMap.get(t.id) !== false,
  }))

  return { data, error: null }
}

export async function setGroupPollTemplateEnabled(
  groupId: string,
  templateId: string,
  isEnabled: boolean,
): Promise<AsyncResult<true>> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('group_poll_template_settings')
    .upsert(
      {
        group_id: groupId,
        template_id: templateId,
        is_enabled: isEnabled,
      },
      { onConflict: 'group_id,template_id', ignoreDuplicates: false },
    )

  if (error) return { data: null, error: error.message }
  revalidatePath(`/groups/${groupId}/settings`)
  return { data: true, error: null }
}

export async function createGroup(input: {
  name: string
  description?: string | null
}): Promise<AsyncResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: group, error: groupErr } = await supabase
    .from('groups')
    .insert({ name: input.name.trim(), description: input.description?.trim() || null, created_by: user.id })
    .select('id')
    .single()

  if (groupErr || !group) return { data: null, error: groupErr?.message ?? 'Errore creazione gruppo' }

  const newGroupId = group.id

  await supabase
    .from('group_members')
    .insert({ group_id: newGroupId, user_id: user.id, role: 'admin' })

  // Award group_founder badge
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const admin = await createAdminClient()
    const { data: founderBadge } = await admin
      .from('badges')
      .select('id')
      .eq('key', 'group_founder')
      .maybeSingle()
    if (founderBadge) {
      await admin.from('player_badges').upsert(
        { user_id: user.id, badge_id: founderBadge.id, group_id: newGroupId, equipped: false },
        { onConflict: 'user_id,badge_id,group_id', ignoreDuplicates: true }
      )
      // Send notification
      await admin.from('notifications').insert({
        user_id: user.id,
        type: 'badge_earned',
        title: '🏗️ Badge sbloccato!',
        body: 'Fondatore',
        read: false,
      })
    }

    // Award early_adopter once (global one-time semantic, stored on first group context).
    const { data: earlyBadge } = await admin
      .from('badges')
      .select('id, name_it, icon')
      .eq('condition_type', 'early_adopter')
      .lte('condition_value', 1)
      .order('condition_value', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (earlyBadge) {
      const { data: alreadyEarly } = await admin
        .from('player_badges')
        .select('id')
        .eq('user_id', user.id)
        .eq('badge_id', earlyBadge.id)
        .limit(1)
        .maybeSingle()

      if (!alreadyEarly) {
        await admin.from('player_badges').upsert(
          { user_id: user.id, badge_id: earlyBadge.id, group_id: newGroupId, equipped: false },
          { onConflict: 'user_id,badge_id,group_id', ignoreDuplicates: true }
        )
        await admin.from('notifications').insert({
          user_id: user.id,
          type: 'badge_earned',
          title: `${earlyBadge.icon ?? '🏅'} Badge sbloccato!`,
          body: earlyBadge.name_it ?? 'Nuovo badge',
          read: false,
        })
      }
    }
  } catch { /* non-critical */ }

  revalidatePath('/groups')
  return { data: { id: newGroupId }, error: null }
}
