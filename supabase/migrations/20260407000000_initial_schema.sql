-- =============================================================================
-- NIPA Risk Dashboard — Full Database Migration
-- Roles: super_admin | admin | user
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";


-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------
create type user_role as enum ('super_admin', 'admin', 'user');

create type risk_rating as enum ('Low', 'Tolerable', 'High', 'Critical');

create type control_rating_type as enum ('Strong', 'Adequate', 'Weak', 'None');

create type treatment_option_type as enum ('Tolerate', 'Treat', 'Transfer', 'Terminate');

create type risk_status_type as enum ('Open', 'In Progress', 'Mitigated', 'Closed', 'Accepted');

create type analysis_type as enum ('Operational', 'Strategic', 'Project', 'Financial', 'Compliance', 'Other');


-- ---------------------------------------------------------------------------
-- 2. PROFILES  (extends auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    email       text not null,
    full_name   text,
    role        user_role not null default 'user',
    is_active   boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user; stores display info and app-level role.';


-- ---------------------------------------------------------------------------
-- 3. ANALYSES
-- ---------------------------------------------------------------------------
create table public.analyses (
    id              uuid primary key default uuid_generate_v4(),
    name            text not null,
    type            text not null default 'Operational',
    description     text,
    contact_person  text,
    created_by      uuid not null references auth.users(id) on delete restrict,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table public.analyses is 'Top-level risk analysis / register.';


-- ---------------------------------------------------------------------------
-- 4. ANALYSIS ACCESS  (sharing analyses with specific users)
-- ---------------------------------------------------------------------------
create table public.analysis_access (
    id           uuid primary key default uuid_generate_v4(),
    analysis_id  uuid not null references public.analyses(id) on delete cascade,
    user_id      uuid not null references auth.users(id) on delete cascade,
    can_edit     boolean not null default false,
    granted_by   uuid not null references auth.users(id) on delete restrict,
    created_at   timestamptz not null default now(),
    unique (analysis_id, user_id)
);

comment on table public.analysis_access is 'Grants a user access to a specific analysis (read or edit).';


-- ---------------------------------------------------------------------------
-- 5. RISK ITEMS
-- ---------------------------------------------------------------------------
create table public.risk_items (
    id                      uuid primary key default uuid_generate_v4(),
    analysis_id             uuid not null references public.analyses(id) on delete cascade,
    risk_id                 text,
    item                    text not null,
    key_business_process    text,
    risk_description        text,
    category                text,
    causes                  text,
    consequence             text,

    -- Inherent risk
    inherent_likelihood     smallint check (inherent_likelihood between 1 and 5),
    inherent_impact         smallint check (inherent_impact between 1 and 5),
    inherent_risk_score     smallint generated always as (
                                coalesce(inherent_likelihood, 0) * coalesce(inherent_impact, 0)
                            ) stored,
    inherent_risk_rating    text,

    -- Controls
    controls                text,
    control_rating          text,

    -- Residual risk
    residual_likelihood     smallint check (residual_likelihood between 1 and 5),
    residual_impact         smallint check (residual_impact between 1 and 5),
    residual_risk_score     smallint generated always as (
                                coalesce(residual_likelihood, 0) * coalesce(residual_impact, 0)
                            ) stored,
    residual_risk_rating    text,

    -- Treatment
    treatment_option        text,
    treatment_actions       text,
    timeframe               text,
    risk_owner              text,
    status                  text,
    date                    date not null default current_date,

    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);

comment on table public.risk_items is 'Individual risk entries within an analysis.';

-- Index for fast analysis lookups
create index risk_items_analysis_id_idx on public.risk_items(analysis_id);


-- ---------------------------------------------------------------------------
-- 6. AUDIT LOG
-- ---------------------------------------------------------------------------
create table public.audit_log (
    id           uuid primary key default uuid_generate_v4(),
    user_id      uuid references auth.users(id) on delete set null,
    action       text not null,         -- e.g. 'INSERT', 'UPDATE', 'DELETE'
    table_name   text not null,
    record_id    uuid,
    old_data     jsonb,
    new_data     jsonb,
    created_at   timestamptz not null default now()
);

comment on table public.audit_log is 'Immutable audit trail for all data mutations.';


-- ---------------------------------------------------------------------------
-- 7. UPDATED_AT TRIGGER (shared)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_profiles_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();

create trigger trg_analyses_updated_at
    before update on public.analyses
    for each row execute function public.set_updated_at();

create trigger trg_risk_items_updated_at
    before update on public.risk_items
    for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 8. AUTO-CREATE PROFILE ON SIGN-UP
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    insert into public.profiles (id, email, full_name, role)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        -- First ever user becomes super_admin; everyone else gets 'user'
        case when (select count(*) from public.profiles) = 0 then 'super_admin' else 'user' end
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 9. HELPER FUNCTIONS
-- ---------------------------------------------------------------------------

-- Returns the role of the currently authenticated user
create or replace function public.get_my_role()
returns user_role language sql stable security definer set search_path = public as $$
    select role from public.profiles where id = auth.uid();
$$;

-- Returns true if caller has at least the given minimum role
create or replace function public.has_role(minimum_role user_role)
returns boolean language sql stable security definer set search_path = public as $$
    select coalesce(
        (select
            case role
                when 'super_admin' then true
                when 'admin'       then minimum_role in ('admin', 'user')
                when 'user'        then minimum_role = 'user'
            end
         from public.profiles where id = auth.uid()
        ),
        false
    );
$$;

-- Returns true if the current user can access the given analysis (read)
create or replace function public.can_access_analysis(p_analysis_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.analyses a
        where a.id = p_analysis_id
          and (
              public.has_role('super_admin')
              or a.created_by = auth.uid()
              or exists (
                  select 1 from public.analysis_access aa
                  where aa.analysis_id = p_analysis_id
                    and aa.user_id = auth.uid()
              )
          )
    );
$$;

-- Returns true if the current user can edit the given analysis
create or replace function public.can_edit_analysis(p_analysis_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.analyses a
        where a.id = p_analysis_id
          and (
              public.has_role('super_admin')
              or (public.has_role('admin') and a.created_by = auth.uid())
              or exists (
                  select 1 from public.analysis_access aa
                  where aa.analysis_id = p_analysis_id
                    and aa.user_id = auth.uid()
                    and aa.can_edit = true
              )
          )
    );
$$;


-- ---------------------------------------------------------------------------
-- 10. RPC FUNCTIONS (callable from frontend / backend)
-- ---------------------------------------------------------------------------

-- ---------- get_analyses_with_stats ----------
-- Returns every analysis the caller can access, with aggregated stats.
create or replace function public.get_analyses_with_stats()
returns table (
    id              uuid,
    name            text,
    type            text,
    description     text,
    contact_person  text,
    created_by      uuid,
    created_at      timestamptz,
    updated_at      timestamptz,
    item_count      bigint,
    avg_inherent    numeric,
    critical_count  bigint
)
language sql stable security definer set search_path = public as $$
    select
        a.id,
        a.name,
        a.type,
        a.description,
        a.contact_person,
        a.created_by,
        a.created_at,
        a.updated_at,
        count(r.id)                                             as item_count,
        round(avg(r.inherent_risk_score)::numeric, 1)          as avg_inherent,
        count(r.id) filter (where r.inherent_risk_rating = 'Critical') as critical_count
    from public.analyses a
    left join public.risk_items r on r.analysis_id = a.id
    where public.can_access_analysis(a.id)
    group by a.id
    order by a.created_at desc;
$$;


-- ---------- get_dashboard_stats ----------
-- Aggregated numbers for the dashboard cards.
create or replace function public.get_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
    v_result jsonb;
begin
    select jsonb_build_object(
        'total_analyses',    count(distinct a.id),
        'total_risks',       count(r.id),
        'critical_risks',    count(r.id) filter (where r.inherent_risk_rating = 'Critical'),
        'high_risks',        count(r.id) filter (where r.inherent_risk_rating = 'High'),
        'avg_inherent',      round(avg(r.inherent_risk_score)::numeric, 1),
        'avg_residual',      round(avg(r.residual_risk_score)::numeric, 1),
        'by_rating',         jsonb_build_object(
            'Low',           count(r.id) filter (where r.inherent_risk_rating = 'Low'),
            'Tolerable',     count(r.id) filter (where r.inherent_risk_rating = 'Tolerable'),
            'High',          count(r.id) filter (where r.inherent_risk_rating = 'High'),
            'Critical',      count(r.id) filter (where r.inherent_risk_rating = 'Critical')
        )
    )
    into v_result
    from public.analyses a
    left join public.risk_items r on r.analysis_id = a.id
    where public.can_access_analysis(a.id);

    return v_result;
end;
$$;


-- ---------- promote_user ----------
-- super_admin only: change any user's role.
create or replace function public.promote_user(
    p_user_id  uuid,
    p_new_role user_role
)
returns void language plpgsql security definer set search_path = public as $$
begin
    if not public.has_role('super_admin') then
        raise exception 'Only super_admin can promote users';
    end if;

    update public.profiles
    set role = p_new_role, updated_at = now()
    where id = p_user_id;

    insert into public.audit_log (user_id, action, table_name, record_id, new_data)
    values (auth.uid(), 'PROMOTE', 'profiles', p_user_id, jsonb_build_object('role', p_new_role));
end;
$$;


-- ---------- grant_analysis_access ----------
-- Analysis owner or super_admin can grant access to another user.
create or replace function public.grant_analysis_access(
    p_analysis_id  uuid,
    p_user_id      uuid,
    p_can_edit     boolean default false
)
returns void language plpgsql security definer set search_path = public as $$
begin
    if not public.can_edit_analysis(p_analysis_id) then
        raise exception 'Not authorised to grant access to this analysis';
    end if;

    insert into public.analysis_access (analysis_id, user_id, can_edit, granted_by)
    values (p_analysis_id, p_user_id, p_can_edit, auth.uid())
    on conflict (analysis_id, user_id)
    do update set can_edit = excluded.can_edit;
end;
$$;


-- ---------- revoke_analysis_access ----------
create or replace function public.revoke_analysis_access(
    p_analysis_id  uuid,
    p_user_id      uuid
)
returns void language plpgsql security definer set search_path = public as $$
begin
    if not public.can_edit_analysis(p_analysis_id) then
        raise exception 'Not authorised to revoke access to this analysis';
    end if;

    delete from public.analysis_access
    where analysis_id = p_analysis_id and user_id = p_user_id;
end;
$$;


-- ---------- list_users (super_admin / admin only) ----------
create or replace function public.list_users()
returns table (
    id          uuid,
    email       text,
    full_name   text,
    role        user_role,
    is_active   boolean,
    created_at  timestamptz
)
language sql stable security definer set search_path = public as $$
    select id, email, full_name, role, is_active, created_at
    from public.profiles
    where public.has_role('admin')   -- admin sees all; super_admin is also ≥ admin
    order by created_at desc;
$$;


-- ---------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

-- ---- profiles ----
alter table public.profiles enable row level security;

-- Super admin: unrestricted
create policy "super_admin_all_profiles"
    on public.profiles for all
    using (public.has_role('super_admin'));

-- Admin: can read all profiles, edit own
create policy "admin_read_profiles"
    on public.profiles for select
    using (public.has_role('admin'));

create policy "own_profile_update"
    on public.profiles for update
    using (id = auth.uid());

-- User: read/update own profile only
create policy "user_read_own_profile"
    on public.profiles for select
    using (id = auth.uid());


-- ---- analyses ----
alter table public.analyses enable row level security;

-- Super admin: full access
create policy "super_admin_all_analyses"
    on public.analyses for all
    using (public.has_role('super_admin'));

-- Admin: full CRUD on own analyses, read on shared
create policy "admin_insert_analyses"
    on public.analyses for insert
    with check (public.has_role('admin') and created_by = auth.uid());

create policy "admin_update_analyses"
    on public.analyses for update
    using (public.has_role('admin') and created_by = auth.uid());

create policy "admin_delete_analyses"
    on public.analyses for delete
    using (public.has_role('admin') and created_by = auth.uid());

-- Any authenticated user can read analyses they have access to
create policy "read_accessible_analyses"
    on public.analyses for select
    using (public.can_access_analysis(id));


-- ---- analysis_access ----
alter table public.analysis_access enable row level security;

create policy "super_admin_all_analysis_access"
    on public.analysis_access for all
    using (public.has_role('super_admin'));

-- Owner or admin can manage access grants for their analyses
create policy "owner_manage_analysis_access"
    on public.analysis_access for all
    using (
        public.has_role('admin')
        and exists (
            select 1 from public.analyses a
            where a.id = analysis_id and a.created_by = auth.uid()
        )
    );

-- Users can see their own access grants
create policy "user_see_own_access"
    on public.analysis_access for select
    using (user_id = auth.uid());


-- ---- risk_items ----
alter table public.risk_items enable row level security;

-- Super admin: full access
create policy "super_admin_all_risk_items"
    on public.risk_items for all
    using (public.has_role('super_admin'));

-- Anyone with edit access can insert / update / delete
create policy "edit_access_write_risk_items"
    on public.risk_items for insert
    with check (public.can_edit_analysis(analysis_id));

create policy "edit_access_update_risk_items"
    on public.risk_items for update
    using (public.can_edit_analysis(analysis_id));

create policy "edit_access_delete_risk_items"
    on public.risk_items for delete
    using (public.can_edit_analysis(analysis_id));

-- Anyone with read access can select
create policy "read_access_risk_items"
    on public.risk_items for select
    using (public.can_access_analysis(analysis_id));


-- ---- audit_log ----
alter table public.audit_log enable row level security;

-- Only super_admin can read the audit log; inserts are done via security definer functions
create policy "super_admin_read_audit_log"
    on public.audit_log for select
    using (public.has_role('super_admin'));


-- ---------------------------------------------------------------------------
-- 12. GRANT USAGE TO authenticated ROLE
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles       to authenticated;
grant select, insert, update, delete on public.analyses       to authenticated;
grant select, insert, update, delete on public.analysis_access to authenticated;
grant select, insert, update, delete on public.risk_items     to authenticated;
grant select                          on public.audit_log      to authenticated;

-- RPC grants
grant execute on function public.get_my_role()                              to authenticated;
grant execute on function public.has_role(user_role)                        to authenticated;
grant execute on function public.can_access_analysis(uuid)                  to authenticated;
grant execute on function public.can_edit_analysis(uuid)                    to authenticated;
grant execute on function public.get_analyses_with_stats()                  to authenticated;
grant execute on function public.get_dashboard_stats()                      to authenticated;
grant execute on function public.promote_user(uuid, user_role)              to authenticated;
grant execute on function public.grant_analysis_access(uuid, uuid, boolean) to authenticated;
grant execute on function public.revoke_analysis_access(uuid, uuid)         to authenticated;
grant execute on function public.list_users()                               to authenticated;
