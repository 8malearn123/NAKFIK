-- Demo accounts shown on the login page (password: Demo@12345).
--   admin@nakfeek.sa      → super admin
--   org1@nakfeek.sa       → organizer (with an active organization)
--   attendee1@nakfeek.sa  → attendee
-- Idempotent: creates missing accounts, and for existing ones resets the
-- password, confirms the email and restores the expected role/profile.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  demo record;
  uid uuid;
BEGIN
  FOR demo IN
    SELECT * FROM (VALUES
      ('admin@nakfeek.sa',     'مدير المنصة',   'attendee'),
      ('org1@nakfeek.sa',      'منظم تجريبي',   'organizer'),
      ('attendee1@nakfeek.sa', 'حاضر تجريبي',   'attendee')
    ) AS t(email, full_name, account_type)
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

    IF demo.email = 'admin@nakfeek.sa' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (uid, 'super_admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    IF demo.account_type = 'organizer' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (uid, 'organizer')
      ON CONFLICT (user_id, role) DO NOTHING;

      IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE owner_id = uid) THEN
        INSERT INTO public.organizations (name, owner_id, subscription_plan, is_active)
        VALUES ('منظمة تجريبية', uid, 'pro', true);
      ELSE
        UPDATE public.organizations SET is_active = true WHERE owner_id = uid;
      END IF;
    END IF;
  END LOOP;
END $$;
