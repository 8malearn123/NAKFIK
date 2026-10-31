-- Separate demo organizers per plan scope (password: Demo@12345).
--   org-public@nakfeek.sa   → organizer, public events only   (plan_scope = 'public')
--   org-private@nakfeek.sa  → organizer, private invitations  (plan_scope = 'private')
--   org1@nakfeek.sa         → organizer, both                 (plan_scope = 'both')
-- Idempotent, same approach as 20261020120000_seed_demo_accounts.sql.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  demo record;
  uid uuid;
BEGIN
  FOR demo IN
    SELECT * FROM (VALUES
      ('org-public@nakfeek.sa',  'منظم الفعاليات العامة', 'organizer', 'public',  'شركة الفعاليات العامة'),
      ('org-private@nakfeek.sa', 'منظم الفعاليات الخاصة', 'organizer', 'private', 'مؤسسة المناسبات الخاصة'),
      ('org1@nakfeek.sa',        'منظم شامل تجريبي',      'organizer', 'both',    'منظمة تجريبية شاملة')
    ) AS t(email, full_name, account_type, plan_scope, org_name)
  LOOP
    SELECT id INTO uid FROM auth.users WHERE lower(email) = demo.email;

    IF uid IS NULL THEN
      uid := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
        demo.email, extensions.crypt('Demo@12345', extensions.gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', demo.full_name, 'account_type', demo.account_type),
        now(), now(),
        '', '', '', ''
      );

      INSERT INTO auth.identities (
        id, user_id, provider_id, provider, identity_data,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), uid, uid::text, 'email',
        jsonb_build_object('sub', uid::text, 'email', demo.email, 'email_verified', true),
        now(), now(), now()
      );
    ELSE
      UPDATE auth.users
      SET encrypted_password = extensions.crypt('Demo@12345', extensions.gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          banned_until = NULL,
          updated_at = now()
      WHERE id = uid;

      INSERT INTO auth.identities (
        id, user_id, provider_id, provider, identity_data,
        last_sign_in_at, created_at, updated_at
      )
      SELECT gen_random_uuid(), uid, uid::text, 'email',
             jsonb_build_object('sub', uid::text, 'email', demo.email, 'email_verified', true),
             now(), now(), now()
      WHERE NOT EXISTS (
        SELECT 1 FROM auth.identities WHERE user_id = uid AND provider = 'email'
      );
    END IF;

    -- Profile (normally created by the on_auth_user_created trigger)
    INSERT INTO public.profiles (id, full_name, email, account_type)
    VALUES (uid, demo.full_name, demo.email, demo.account_type)
    ON CONFLICT (id) DO UPDATE
      SET account_type = EXCLUDED.account_type,
          email = EXCLUDED.email,
          full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name);

    IF demo.account_type = 'organizer' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (uid, 'organizer')
      ON CONFLICT (user_id, role) DO NOTHING;

      IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE owner_id = uid) THEN
        INSERT INTO public.organizations (name, owner_id, subscription_plan, is_active, plan_scope)
        VALUES (demo.org_name, uid, 'pro', true, demo.plan_scope);
      ELSE
        UPDATE public.organizations SET is_active = true, plan_scope = demo.plan_scope WHERE owner_id = uid;
      END IF;
    END IF;
  END LOOP;
END $$;
