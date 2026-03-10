-- Add optional secondary preferred role to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_role_2 text
  CHECK (preferred_role_2 IN ('D', 'C', 'E', 'W', 'A'));
