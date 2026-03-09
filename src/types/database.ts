/**
 * Kicksy — Supabase Database Types
 * Must conform to @supabase/supabase-js GenericSchema / GenericTable shape.
 *
 * IMPORTANT: All row types must be `type` aliases (not `interface`) so that
 * TypeScript correctly resolves `Row extends Record<string, unknown>` in
 * conditional types used by the Supabase client generics.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

/* ---- Enums ---- */
export type PlayerRole = 'D' | 'C' | 'E' | 'W' | 'A'
export type MemberRole = 'admin' | 'member'
export type MatchStatus = 'draft' | 'open' | 'locked' | 'played' | 'cancelled'
export type RegistrationStatus = 'confirmed' | 'waitlist' | 'declined'
export type BadgeTier = 'bronze' | 'silver' | 'gold'
export type NotificationType =
  | 'match_invite' | 'match_reminder' | 'match_result' | 'team_generated'
  | 'rating_request' | 'badge_earned' | 'level_up' | 'poll_open'

/* ---- Row types (must be `type`, not `interface`) ---- */

export type Profile = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  preferred_role: PlayerRole | null
  xp: number
  level: number
  created_at: string
  updated_at: string
}

export type Group = {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  sport_type: string
  invite_code: string
  invite_link_enabled: boolean
  max_members: number | null
  created_by: string
  created_at: string
  updated_at: string
}

export type GroupMember = {
  group_id: string
  user_id: string
  role: MemberRole
  display_name: string | null
  is_active: boolean
  joined_at: string
}

export type Match = {
  id: string
  group_id: string
  title: string
  description: string | null
  scheduled_at: string
  location: string | null
  max_players: number
  min_players: number
  status: MatchStatus
  registration_deadline: string | null
  team_size: number
  created_by: string
  created_at: string
  updated_at: string
}

export type MatchRegistration = {
  id: string
  match_id: string
  user_id: string
  status: RegistrationStatus
  team_id: number | null
  registered_at: string
}

export type MatchResult = {
  id: string
  match_id: string
  team1_score: number
  team2_score: number
  mvp_user_id: string | null
  notes: string | null
  created_by: string
  created_at: string
}

export type GeneratedTeam = {
  id: string
  match_id: string
  team1_user_ids: string[]
  team2_user_ids: string[]
  team1_strength: number
  team2_strength: number
  balance_score: number
  algorithm_version: string
  is_confirmed: boolean
  created_at: string
}

export type PlayerStats = {
  id: string
  user_id: string
  group_id: string
  matches_played: number
  matches_won: number
  matches_drawn: number
  matches_lost: number
  goals_scored: number
  assists: number
  clean_sheets: number
  mvp_count: number
  xp_from_matches: number
  updated_at: string
  created_at: string
}

export type PlayerRating = {
  id: string
  rater_id: string
  ratee_id: string
  group_id: string
  match_id: string | null
  velocita: number
  resistenza: number
  forza: number
  salto: number
  agilita: number
  tecnica_palla: number
  dribbling: number
  passaggio: number
  tiro: number
  colpo_di_testa: number
  lettura_gioco: number
  posizionamento: number
  pressing: number
  costruzione: number
  marcatura: number
  tackle: number
  intercettamento: number
  copertura: number
  finalizzazione: number
  assist_making: number
  leadership: number
  comunicazione: number
  mentalita_competitiva: number
  fair_play: number
  created_at: string
}

export type Badge = {
  id: string
  key: string
  name_it: string
  name_en: string
  description_it: string
  description_en: string
  icon: string
  tier: BadgeTier
  condition_type: string
  condition_value: number
}

export type PlayerBadge = {
  id: string
  user_id: string
  badge_id: string
  group_id: string | null
  earned_at: string
  equipped: boolean
}

export type PlayerTitle = {
  id: string
  user_id: string
  title_key: string
  title_text: string
  earned_at: string
  equipped: boolean
}

export type Poll = {
  id: string
  match_id: string
  group_id: string
  question: string
  options: string[]
  closes_at: string | null
  created_by: string
  created_at: string
}

export type PollVote = {
  id: string
  poll_id: string
  user_id: string
  option_index: number
  voted_at: string
}

export type Notification = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  data: Json | null
  read: boolean
  created_at: string
}

/* ---- Database type (matches @supabase/supabase-js GenericSchema) ---- */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferred_role?: PlayerRole | null
          xp?: number
          level?: number
        }
        Update: {
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferred_role?: PlayerRole | null
          xp?: number
          level?: number
          updated_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: Group
        Insert: {
          name: string
          created_by: string
          description?: string | null
          avatar_url?: string | null
          sport_type?: string
          invite_code?: string
          invite_link_enabled?: boolean
          max_members?: number | null
        }
        Update: {
          name?: string
          description?: string | null
          avatar_url?: string | null
          sport_type?: string
          invite_code?: string
          invite_link_enabled?: boolean
          max_members?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: GroupMember
        Insert: {
          group_id: string
          user_id: string
          role?: MemberRole
          display_name?: string | null
          is_active?: boolean
        }
        Update: {
          role?: MemberRole
          display_name?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      matches: {
        Row: Match
        Insert: {
          group_id: string
          title: string
          scheduled_at: string
          created_by: string
          description?: string | null
          location?: string | null
          max_players?: number
          min_players?: number
          status?: MatchStatus
          registration_deadline?: string | null
          team_size?: number
        }
        Update: {
          title?: string
          description?: string | null
          scheduled_at?: string
          location?: string | null
          max_players?: number
          min_players?: number
          status?: MatchStatus
          registration_deadline?: string | null
          team_size?: number
          updated_at?: string
        }
        Relationships: []
      }
      match_registrations: {
        Row: MatchRegistration
        Insert: {
          match_id: string
          user_id: string
          status?: RegistrationStatus
          team_id?: number | null
        }
        Update: {
          status?: RegistrationStatus
          team_id?: number | null
        }
        Relationships: []
      }
      match_results: {
        Row: MatchResult
        Insert: {
          match_id: string
          team1_score: number
          team2_score: number
          created_by: string
          mvp_user_id?: string | null
          notes?: string | null
        }
        Update: {
          team1_score?: number
          team2_score?: number
          mvp_user_id?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      generated_teams: {
        Row: GeneratedTeam
        Insert: {
          match_id: string
          team1_user_ids: string[]
          team2_user_ids: string[]
          team1_strength: number
          team2_strength: number
          balance_score: number
          algorithm_version?: string
          is_confirmed?: boolean
        }
        Update: {
          team1_user_ids?: string[]
          team2_user_ids?: string[]
          team1_strength?: number
          team2_strength?: number
          balance_score?: number
          algorithm_version?: string
          is_confirmed?: boolean
        }
        Relationships: []
      }
      player_stats: {
        Row: PlayerStats
        Insert: {
          user_id: string
          group_id: string
          matches_played?: number
          matches_won?: number
          matches_drawn?: number
          matches_lost?: number
          goals_scored?: number
          assists?: number
          clean_sheets?: number
          mvp_count?: number
          xp_from_matches?: number
        }
        Update: {
          matches_played?: number
          matches_won?: number
          matches_drawn?: number
          matches_lost?: number
          goals_scored?: number
          assists?: number
          clean_sheets?: number
          mvp_count?: number
          xp_from_matches?: number
          updated_at?: string
        }
        Relationships: []
      }
      player_ratings: {
        Row: PlayerRating
        Insert: {
          rater_id: string
          ratee_id: string
          group_id: string
          match_id?: string | null
          velocita: number
          resistenza: number
          forza: number
          salto: number
          agilita: number
          tecnica_palla: number
          dribbling: number
          passaggio: number
          tiro: number
          colpo_di_testa: number
          lettura_gioco: number
          posizionamento: number
          pressing: number
          costruzione: number
          marcatura: number
          tackle: number
          intercettamento: number
          copertura: number
          finalizzazione: number
          assist_making: number
          leadership: number
          comunicazione: number
          mentalita_competitiva: number
          fair_play: number
        }
        Update: Record<string, never>
        Relationships: []
      }
      badges: {
        Row: Badge
        Insert: {
          key: string
          name_it: string
          name_en: string
          description_it: string
          description_en: string
          icon: string
          tier: BadgeTier
          condition_type: string
          condition_value: number
        }
        Update: {
          key?: string
          name_it?: string
          name_en?: string
          description_it?: string
          description_en?: string
          icon?: string
          tier?: BadgeTier
          condition_type?: string
          condition_value?: number
        }
        Relationships: []
      }
      player_badges: {
        Row: PlayerBadge
        Insert: {
          user_id: string
          badge_id: string
          group_id?: string | null
          equipped?: boolean
        }
        Update: {
          equipped?: boolean
        }
        Relationships: []
      }
      player_titles: {
        Row: PlayerTitle
        Insert: {
          user_id: string
          title_key: string
          title_text: string
          equipped?: boolean
        }
        Update: {
          equipped?: boolean
        }
        Relationships: []
      }
      polls: {
        Row: Poll
        Insert: {
          match_id: string
          group_id: string
          question: string
          options: string[]
          created_by: string
          closes_at?: string | null
        }
        Update: {
          question?: string
          options?: string[]
          closes_at?: string | null
        }
        Relationships: []
      }
      poll_votes: {
        Row: PollVote
        Insert: {
          poll_id: string
          user_id: string
          option_index: number
        }
        Update: Record<string, never>
        Relationships: []
      }
      notifications: {
        Row: Notification
        Insert: {
          user_id: string
          type: NotificationType
          title: string
          body: string
          data?: Json | null
          read?: boolean
        }
        Update: {
          read?: boolean
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_group_member: { Args: { p_group_id: string }; Returns: boolean }
      is_group_admin: { Args: { p_group_id: string }; Returns: boolean }
      join_group_by_invite_code: { Args: { p_invite_code: string }; Returns: string }
    }
  }
}
