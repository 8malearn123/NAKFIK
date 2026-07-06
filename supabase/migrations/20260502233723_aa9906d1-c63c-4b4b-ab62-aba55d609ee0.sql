ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS invite_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.team_members ALTER COLUMN user_id DROP NOT NULL;