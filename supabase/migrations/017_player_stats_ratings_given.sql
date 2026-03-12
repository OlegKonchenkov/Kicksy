-- ============================================================
-- Kicksy - Track ratings_given in player_stats
-- Migration: 017_player_stats_ratings_given.sql
-- ============================================================

ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS ratings_given INTEGER NOT NULL DEFAULT 0;

