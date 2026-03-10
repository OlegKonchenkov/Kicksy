ALTER TABLE player_ratings
  ADD COLUMN IF NOT EXISTS comment text;
