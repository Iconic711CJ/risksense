-- ============================================================
-- ERIMP Clean Schema Migration
-- Single profiles table — no user_profiles duplication.
-- Safe to run on a fresh Supabase project.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;


-- ── Drop all tables (reverse FK order) ───────────────────────
DROP TABLE IF EXISTS public.risks             CASCADE;
DROP TABLE IF EXISTS public.user_profiles     CASCADE;
DROP TABLE IF EXISTS public.departments       CASCADE;
DROP TABLE IF EXISTS public.audit_log         CASCADE;
DROP TABLE IF EXISTS public.risk_items        CASCADE;
DROP TABLE IF EXISTS public.analysis_access   CASCADE;
DROP TABLE IF EXISTS public.analyses          CASCADE;
DROP TABLE IF EXISTS public.profiles          CASCADE;

DROP TYPE IF EXISTS public.user_role             CASCADE;
DROP TYPE IF EXISTS public.risk_rating           CASCADE;
DROP TYPE IF EXISTS public.control_rating_type   CASCADE;
DROP TYPE IF EXISTS public.treatment_option_type CASCADE;
DROP TYPE IF EXISTS public.risk_status_type      CASCADE;
DROP TYPE IF EXISTS public.analysis_type         CASCADE;


-- ── Shared trigger functions ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Alias so old RiskSense triggers keep working
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ============================================================
-- CORE TABLES
-- ============================================================

-- ── profiles  (single source of truth for every user) ────────
CREATE TABLE public.profiles (
  id            UUID        NOT NULL,
  email         TEXT        NOT NULL,
  full_name     TEXT,
  role          TEXT        NOT NULL DEFAULT 'department_user'
                              CHECK (role IN ('admin', 'department_user', 'super_admin', 'user')),
  department_id UUID,                         -- NULL for admins
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_pkey    PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
  -- department_id FK added after departments table exists (see below)
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── departments ───────────────────────────────────────────────
CREATE TABLE public.departments (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  code       TEXT        NOT NULL,
  created_at TIMESTAMPTZ          DEFAULT NOW(),
  CONSTRAINT departments_pkey     PRIMARY KEY (id),
  CONSTRAINT departments_name_key UNIQUE (name),
  CONSTRAINT departments_code_key UNIQUE (code)
);

-- Now safe to add the FK
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_department_id_fkey
  FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;

-- ── audit_log ─────────────────────────────────────────────────
CREATE TABLE public.audit_log (
  id          UUID        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id     UUID,
  user_name   TEXT,
  action      TEXT        NOT NULL,
  table_name  TEXT        NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT audit_log_pkey         PRIMARY KEY (id),
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL
);

-- ── analyses  (RiskSense legacy) ─────────────────────────────
CREATE TABLE public.analyses (
  id             UUID        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name           TEXT        NOT NULL,
  type           TEXT        NOT NULL DEFAULT 'Operational',
  description    TEXT,
  contact_person TEXT,
  created_by     UUID        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analyses_pkey            PRIMARY KEY (id),
  CONSTRAINT analyses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_analyses_updated_at
  BEFORE UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── analysis_access  (RiskSense legacy) ──────────────────────
CREATE TABLE public.analysis_access (
  id          UUID        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  analysis_id UUID        NOT NULL,
  user_id     UUID        NOT NULL,
  can_edit    BOOLEAN     NOT NULL DEFAULT FALSE,
  granted_by  UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analysis_access_pkey                    PRIMARY KEY (id),
  CONSTRAINT analysis_access_analysis_id_user_id_key UNIQUE (analysis_id, user_id),
  CONSTRAINT analysis_access_analysis_id_fkey        FOREIGN KEY (analysis_id) REFERENCES public.analyses (id)   ON DELETE CASCADE,
  CONSTRAINT analysis_access_granted_by_fkey         FOREIGN KEY (granted_by)  REFERENCES auth.users (id)        ON DELETE RESTRICT,
  CONSTRAINT analysis_access_user_id_fkey            FOREIGN KEY (user_id)     REFERENCES auth.users (id)        ON DELETE CASCADE
);

-- ── risk_items  (RiskSense legacy) ───────────────────────────
CREATE TABLE public.risk_items (
  id                   UUID      NOT NULL DEFAULT extensions.uuid_generate_v4(),
  analysis_id          UUID      NOT NULL,
  risk_id              TEXT,
  item                 TEXT      NOT NULL,
  key_business_process TEXT,
  risk_description     TEXT,
  category             TEXT,
  causes               TEXT,
  consequence          TEXT,
  inherent_likelihood  SMALLINT  CHECK (inherent_likelihood BETWEEN 1 AND 5),
  inherent_impact      SMALLINT  CHECK (inherent_impact     BETWEEN 1 AND 5),
  inherent_risk_score  SMALLINT  GENERATED ALWAYS AS (
                         COALESCE(inherent_likelihood::INT, 0) * COALESCE(inherent_impact::INT, 0)
                       ) STORED,
  inherent_risk_rating TEXT,
  controls             TEXT,
  control_rating       TEXT,
  residual_likelihood  SMALLINT  CHECK (residual_likelihood BETWEEN 1 AND 5),
  residual_impact      SMALLINT  CHECK (residual_impact     BETWEEN 1 AND 5),
  residual_risk_score  SMALLINT  GENERATED ALWAYS AS (
                         COALESCE(residual_likelihood::INT, 0) * COALESCE(residual_impact::INT, 0)
                       ) STORED,
  residual_risk_rating TEXT,
  treatment_option     TEXT,
  treatment_actions    TEXT,
  timeframe            TEXT,
  risk_owner           TEXT,
  status               TEXT,
  date                 DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT risk_items_pkey             PRIMARY KEY (id),
  CONSTRAINT risk_items_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.analyses (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS risk_items_analysis_id_idx
  ON public.risk_items USING btree (analysis_id);

CREATE TRIGGER trg_risk_items_updated_at
  BEFORE UPDATE ON public.risk_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── risks  (ERIMP) ────────────────────────────────────────────
CREATE TABLE public.risks (
  id              UUID    NOT NULL DEFAULT gen_random_uuid(),
  risk_code       TEXT    NOT NULL,
  department_id   UUID    NOT NULL,
  description     TEXT    NOT NULL,
  category        TEXT    NOT NULL,
  tags            TEXT[]           DEFAULT '{}',
  likelihood      INT     NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  impact          INT     NOT NULL CHECK (impact     BETWEEN 1 AND 5),
  risk_score      INT     GENERATED ALWAYS AS (likelihood * impact) STORED,
  risk_rating     TEXT    GENERATED ALWAYS AS (
                    CASE
                      WHEN likelihood * impact <= 4  THEN 'Low'
                      WHEN likelihood * impact <= 9  THEN 'Tolerable'
                      WHEN likelihood * impact <= 16 THEN 'High'
                      ELSE 'Critical'
                    END
                  ) STORED,
  owner_id        UUID,
  owner_name      TEXT,
  status          TEXT    NOT NULL DEFAULT 'Identified'
                    CHECK (status IN ('Identified', 'Under Mitigation', 'Resolved')),
  mitigation_plan TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT risks_pkey               PRIMARY KEY (id),
  CONSTRAINT risks_risk_code_key      UNIQUE (risk_code),
  CONSTRAINT risks_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id),
  CONSTRAINT risks_owner_id_fkey      FOREIGN KEY (owner_id)      REFERENCES public.profiles    (id) ON DELETE SET NULL
);

CREATE TRIGGER trg_risks_updated_at
  BEFORE UPDATE ON public.risks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- Fires whenever a new row is inserted into auth.users.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, department_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'department_user'),
    (NEW.raw_user_meta_data->>'department_id')::UUID
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own_all"    ON public.profiles FOR ALL    TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_admin_read" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_read"  ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_admin" ON public.departments FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- risks
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risks_admin_all"   ON public.risks FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "risks_dept_select" ON public.risks FOR SELECT TO authenticated
  USING (department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "risks_dept_insert" ON public.risks FOR INSERT TO authenticated
  WITH CHECK (department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "risks_dept_update" ON public.risks FOR UPDATE TO authenticated
  USING (department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid()));

-- audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_admin"  ON public.audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO public.departments (name, code) VALUES
  ('Procurement',        'PROC'),
  ('Distance Learning',  'DL'),
  ('Marketing',          'MKT'),
  ('Administration',     'ADMIN'),
  ('Finance',            'FIN'),
  ('IT & Systems',       'IT'),
  ('HR & Staffing',      'HR'),
  ('Legal & Compliance', 'LEGAL'),
  ('Facilities',         'FAC')
ON CONFLICT (code) DO NOTHING;

-- Admin profile — reads UUID directly from auth.users (FK always satisfied)
INSERT INTO public.profiles (id, email, full_name, role, department_id)
SELECT id, email, email, 'admin', NULL
FROM auth.users
WHERE email = 'cjwanakamondo@gmail.com'
ON CONFLICT (id) DO UPDATE
  SET role = 'admin', department_id = NULL, updated_at = NOW();
