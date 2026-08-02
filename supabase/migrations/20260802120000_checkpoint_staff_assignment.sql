-- تعيين موظف لكل بوابة — من صلاحيات إدارة المنصة فقط.
-- المنظم ينشئ البوابات ويسميها فقط؛ أي محاولة منه لتغيير التعيين تُرفض
-- على مستوى قاعدة البيانات (وليس الواجهة فقط).

ALTER TABLE public.checkpoints
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.guard_checkpoint_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- عمليات الخادم (service role) غير مقيدة
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_user_id IS NOT NULL
       AND NOT public.has_role(auth.uid(), 'super_admin') THEN
      RAISE EXCEPTION 'ASSIGNMENT_ADMIN_ONLY'
        USING HINT = 'تعيين الموظفين على البوابات من صلاحيات الإدارة فقط';
    END IF;
  ELSIF NEW.assigned_user_id IS DISTINCT FROM OLD.assigned_user_id THEN
    IF NOT public.has_role(auth.uid(), 'super_admin') THEN
      RAISE EXCEPTION 'ASSIGNMENT_ADMIN_ONLY'
        USING HINT = 'تعيين الموظفين على البوابات من صلاحيات الإدارة فقط';
    END IF;
    NEW.assigned_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_checkpoint_assignment ON public.checkpoints;
CREATE TRIGGER trg_guard_checkpoint_assignment
  BEFORE INSERT OR UPDATE ON public.checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_checkpoint_assignment();

-- الموظف المعيَّن يرى بوابته دائماً (حتى لو لم يكن ضمن فريق المؤسسة)
DROP POLICY IF EXISTS "Assigned staff view own checkpoint" ON public.checkpoints;
CREATE POLICY "Assigned staff view own checkpoint"
  ON public.checkpoints FOR SELECT TO authenticated
  USING (assigned_user_id = auth.uid());
