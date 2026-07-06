ALTER TABLE public.private_invitations
  ADD COLUMN IF NOT EXISTS layout_style text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS ornament_style text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS body_font text NOT NULL DEFAULT 'Cairo',
  ADD COLUMN IF NOT EXISTS text_color text NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS template_key text;

CREATE TABLE IF NOT EXISTS public.certificate_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  title text NOT NULL,
  subtitle text,
  body_text text,
  issuer_name text,
  signature_name text,
  signature_title text,
  template_key text NOT NULL DEFAULT 'classic-gold',
  layout_style text NOT NULL DEFAULT 'classic',
  ornament_style text NOT NULL DEFAULT 'arabesque',
  theme_color text NOT NULL DEFAULT '#0F1B3D',
  accent_color text NOT NULL DEFAULT '#C9A84C',
  background_color text NOT NULL DEFAULT '#FFFFFF',
  text_color text NOT NULL DEFAULT '#1A1A1A',
  heading_font text NOT NULL DEFAULT 'Amiri',
  body_font text NOT NULL DEFAULT 'Cairo',
  background_image_url text,
  logo_url text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.certificate_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage their certificate designs"
  ON public.certificate_designs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = certificate_designs.organization_id AND o.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = certificate_designs.organization_id AND o.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Public can view certificate designs"
  ON public.certificate_designs FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER update_certificate_designs_updated_at
  BEFORE UPDATE ON public.certificate_designs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.certificate_design_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_design_id uuid NOT NULL REFERENCES public.certificate_designs(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  recipient_email text,
  recipient_phone text,
  verification_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex') UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cdr_design ON public.certificate_design_recipients(certificate_design_id);
CREATE INDEX IF NOT EXISTS idx_cdr_token ON public.certificate_design_recipients(verification_token);

ALTER TABLE public.certificate_design_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage their cert recipients"
  ON public.certificate_design_recipients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.certificate_designs cd
      JOIN public.organizations o ON o.id = cd.organization_id
      WHERE cd.id = certificate_design_recipients.certificate_design_id
        AND o.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.certificate_designs cd
      JOIN public.organizations o ON o.id = cd.organization_id
      WHERE cd.id = certificate_design_recipients.certificate_design_id
        AND o.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Anyone can verify recipient by token"
  ON public.certificate_design_recipients FOR SELECT
  TO anon, authenticated USING (true);
