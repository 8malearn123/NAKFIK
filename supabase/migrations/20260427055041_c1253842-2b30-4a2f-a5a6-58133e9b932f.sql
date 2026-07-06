-- Add visibility and sale flags to tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS is_for_sale boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_visibility_check;
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_visibility_check CHECK (visibility IN ('public','private'));

-- Update public RLS to hide private tickets from anonymous browsing
DROP POLICY IF EXISTS "Public view active tickets" ON public.tickets;
CREATE POLICY "Public view active tickets"
ON public.tickets
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND visibility = 'public'
  AND event_id IN (SELECT id FROM public.events WHERE status = 'published')
);
