-- =============================================================================
-- Migration 0001: ensure_my_profile RPC + self-insert policy on profiles
-- Run this in the Supabase SQL Editor if not already applied.
-- =============================================================================

-- Allow an authenticated user to insert their OWN profile row
-- (covers the edge case where the trigger fires before the JWT is set up)
do $$
begin
    if not exists (
        select 1 from pg_policies
        where tablename = 'profiles' and policyname = 'user_insert_own_profile'
    ) then
        execute $policy$
            create policy "user_insert_own_profile"
                on public.profiles for insert
                with check (id = auth.uid())
        $policy$;
    end if;
end $$;


-- RPC: upsert the calling user's profile row (security definer bypasses RLS)
-- Called by the backend /me endpoint as a safety net on every login.
create or replace function public.ensure_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id   uuid  := auth.uid();
    v_email     text;
    v_full_name text;
    v_profile   public.profiles;
begin
    if v_user_id is null then
        raise exception 'Not authenticated';
    end if;

    -- Pull email from auth.users
    select email into v_email
    from auth.users
    where id = v_user_id;

    v_full_name := split_part(v_email, '@', 1);

    insert into public.profiles (id, email, full_name, role)
    values (
        v_user_id,
        v_email,
        v_full_name,
        -- First user ever becomes super_admin
        case when (select count(*) from public.profiles) = 0
             then 'super_admin'::user_role
             else 'user'::user_role
        end
    )
    on conflict (id) do update
        set email      = excluded.email,
            updated_at = now()
    returning * into v_profile;

    return v_profile;
end;
$$;

grant execute on function public.ensure_my_profile() to authenticated;

-- =============================================================================
-- FIX TRIGGER CAUSING 500 ERRORS ON SIGNUP
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    insert into public.profiles (id, email, full_name, role)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        case when (select count(*) from public.profiles) = 0 then 'super_admin'::public.user_role else 'user'::public.user_role end
    );
    return new;
end;
$$;
