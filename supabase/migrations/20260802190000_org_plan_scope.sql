-- Organizer plan packages: which feature scope the organization subscribed to.
-- private = private invitations only, public = public events only, both = everything.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan_scope text NOT NULL DEFAULT 'both'
  CHECK (plan_scope IN ('private', 'public', 'both'));
