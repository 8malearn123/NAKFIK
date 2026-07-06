
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS allow_companions boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_companions integer NOT NULL DEFAULT 0;

ALTER TABLE public.event_guests
  ADD COLUMN IF NOT EXISTS parent_guest_id uuid REFERENCES public.event_guests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS companions_allowed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS companions_used integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_event_guests_parent ON public.event_guests(parent_guest_id);

DROP POLICY IF EXISTS "Public insert companion guests" ON public.event_guests;
CREATE POLICY "Public insert companion guests"
ON public.event_guests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  parent_guest_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.event_guests p
    WHERE p.id = parent_guest_id
      AND p.companions_used < p.companions_allowed
  )
);
