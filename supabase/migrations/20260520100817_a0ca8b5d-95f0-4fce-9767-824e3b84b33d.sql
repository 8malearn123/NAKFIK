ALTER TABLE public.private_invitations 
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'wedding',
ADD COLUMN IF NOT EXISTS formality TEXT NOT NULL DEFAULT 'personal';

COMMENT ON COLUMN public.private_invitations.category IS 'wedding | engagement | graduation | forum | conference | opening | vip | corporate | other';
COMMENT ON COLUMN public.private_invitations.formality IS 'personal | formal | business';