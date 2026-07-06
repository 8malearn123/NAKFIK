
ALTER TABLE public.event_guests
  ADD COLUMN IF NOT EXISTS ticket_id uuid,
  ADD COLUMN IF NOT EXISTS extra_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS data_collected_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_event_guests_ticket_id ON public.event_guests(ticket_id);
