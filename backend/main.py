from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, field_validator
from typing import Optional, List
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
from collections import defaultdict

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", SUPABASE_KEY)

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Missing SUPABASE_URL or SUPABASE_KEY. "
        "Create a .env file in the backend/ directory."
    )

# anon client — used only for verifying user JWTs via auth.get_user()
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# service-role client — bypasses RLS; all app-level access control is here
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Token → AuthUser cache to avoid a Supabase network call on every request.
# Entries expire after TOKEN_CACHE_TTL seconds. This prevents flaky outbound
# connections from returning spurious 401s and logging the user out.
TOKEN_CACHE_TTL = 60  # seconds
_token_cache: dict[str, tuple[object, float]] = {}  # token → (AuthUser, expires_at)

app = FastAPI(title="ERIMP API — Enterprise Risk Intelligence & Mitigation Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

class AuthUser:
    def __init__(self, id: str, email: str, role: str, department_id: Optional[str],
                 full_name: str, department_code: Optional[str] = None,
                 department_name: Optional[str] = None):
        self.id = id
        self.email = email
        self.role = role
        self.department_id = department_id
        self.full_name = full_name
        self.department_code = department_code
        self.department_name = department_name


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> AuthUser:
    import time
    token = credentials.credentials

    # Return cached result if still valid
    cached = _token_cache.get(token)
    if cached:
        auth_user, expires_at = cached
        if time.time() < expires_at:
            return auth_user
        else:
            del _token_cache[token]

    try:
        res = supabase.auth.get_user(token)
        if not res or not res.user:
            raise ValueError("No user")
        user_id = str(res.user.id)
        profile_res = supabase_admin.table("profiles").select(
            "*, departments(name, code)"
        ).eq("id", user_id).limit(1).execute()
        if not profile_res.data:
            raise ValueError("No profile")
        p = profile_res.data[0]
        dept = p.get("departments") or {}
        auth_user = AuthUser(
            id=user_id,
            email=res.user.email,
            role=p.get("role", "department_user"),
            department_id=p.get("department_id"),
            full_name=p.get("full_name", ""),
            department_code=dept.get("code"),
            department_name=dept.get("name"),
        )
        _token_cache[token] = (auth_user, time.time() + TOKEN_CACHE_TTL)
        return auth_user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_admin(user: AuthUser = Depends(verify_token)) -> AuthUser:
    if user.role not in {"admin", "super_admin"}:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_super_admin(user: AuthUser = Depends(verify_token)) -> AuthUser:
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


# ---------------------------------------------------------------------------
# Audit logging
# ---------------------------------------------------------------------------

def log_audit(user: AuthUser, action: str, table_name: str,
              record_id=None, old_value=None, new_value=None):
    try:
        supabase_admin.table("audit_log").insert({
            "user_id": user.id,
            "user_name": user.full_name,
            "action": action,
            "table_name": table_name,
            "record_id": str(record_id) if record_id else None,
            "old_value": old_value,
            "new_value": new_value,
        }).execute()
    except Exception:
        pass  # Non-fatal


# ---------------------------------------------------------------------------
# Risk scoring helpers
# ---------------------------------------------------------------------------

def score_to_rating(score: int) -> str:
    if score <= 4:
        return "Low"
    if score <= 9:
        return "Tolerable"
    if score <= 16:
        return "High"
    return "Critical"


RISK_CATEGORIES = [
    "Operational", "Strategic", "Financial", "Compliance",
    "Reputational", "Environmental", "Technological", "Other"
]

LIKELIHOOD_LABELS = {1: "Rare", 2: "Unlikely", 3: "Possible", 4: "Likely", 5: "Certain"}
IMPACT_LABELS = {1: "Negligible", 2: "Minor", 3: "Moderate", 4: "High", 5: "Critical"}

DEPT_CODES = {
    "Procurement": "PROC",
    "Distance Learning": "DL",
    "Marketing": "MKT",
    "Administration": "ADMIN",
    "Finance": "FIN",
    "IT & Systems": "IT",
    "HR & Staffing": "HR",
    "Legal & Compliance": "LEGAL",
    "Facilities": "FAC",
}

TAG_KEYWORDS = {
    "#IT_Infrastructure": ["server", "network", "system", "infrastructure", "hardware", "software"],
    "#Cybersecurity": ["cyber", "breach", "hack", "malware", "phishing", "security", "data"],
    "#Financial": ["budget", "expenditure", "revenue", "financial", "payment", "fund"],
    "#Budget": ["budget", "overspend", "underfund", "allocation", "appropriation"],
    "#HumanResources": ["staff", "employee", "hr", "recruitment", "retention", "turnover", "personnel"],
    "#Procurement": ["procurement", "supplier", "vendor", "contract", "tender", "bid"],
    "#AcademicIntegrity": ["exam", "student", "academic", "lecturer", "course", "curriculum"],
    "#Facilities": ["fire", "flood", "building", "facility", "maintenance", "infrastructure"],
    "#LegalCompliance": ["legal", "compliance", "regulation", "policy", "law", "audit", "governance"],
    "#HealthSafety": ["health", "safety", "emergency", "pandemic", "disease", "accident"],
}


def suggest_tags(description: str) -> List[str]:
    desc_lower = description.lower()
    tags = set()
    for tag, keywords in TAG_KEYWORDS.items():
        if any(kw in desc_lower for kw in keywords):
            tags.add(tag)
    return list(tags)


def generate_risk_code(dept_code: str, dept_id: str) -> str:
    """Generate next sequential risk code for a department, e.g. PROC-007"""
    try:
        existing = supabase_admin.table("risks").select("risk_code").eq(
            "department_id", dept_id
        ).execute()
        max_num = 0
        for row in (existing.data or []):
            code = row.get("risk_code", "")
            if "-" in code:
                try:
                    num = int(code.split("-")[-1])
                    max_num = max(max_num, num)
                except ValueError:
                    pass
        return f"{dept_code}-{str(max_num + 1).zfill(3)}"
    except Exception:
        from uuid import uuid4
        return f"{dept_code}-{str(uuid4())[:4].upper()}"


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Debug / Setup check (public — remove in production)
# ---------------------------------------------------------------------------

@app.get("/debug/setup")
def debug_setup():
    """Public endpoint to diagnose Supabase connection + table existence."""
    results = {}

    # 1. Supabase URL configured?
    results["supabase_url"] = SUPABASE_URL[:40] + "..." if SUPABASE_URL else "MISSING"
    results["supabase_key_set"] = bool(SUPABASE_KEY)
    results["service_key_set"] = bool(SUPABASE_SERVICE_KEY and SUPABASE_SERVICE_KEY != SUPABASE_KEY)

    # 2. Can we query each table?
    for table in ["departments", "profiles", "risks", "audit_log"]:
        try:
            r = supabase_admin.table(table).select("id").limit(1).execute()
            results[f"table_{table}"] = f"OK ({len(r.data)} rows visible)"
        except Exception as e:
            results[f"table_{table}"] = f"ERROR: {type(e).__name__}: {str(e)[:120]}"

    # 3. Auth test (just check the client is reachable)
    try:
        supabase.auth.get_session()
        results["auth_client"] = "reachable"
    except Exception as e:
        results["auth_client"] = f"ERROR: {e}"

    return results

class LoginRequest(BaseModel):
    email: str
    password: str


class RiskCreate(BaseModel):
    description: str
    category: str
    likelihood: int
    impact: int
    owner_name: Optional[str] = None
    mitigation_plan: Optional[str] = None
    status: Optional[str] = "Identified"
    tags: Optional[List[str]] = []
    department_id: Optional[str] = None  # admin can specify

    @field_validator("likelihood", "impact", mode="before")
    @classmethod
    def validate_rating(cls, v):
        if not (1 <= int(v) <= 5):
            raise ValueError("Must be between 1 and 5")
        return int(v)


class RiskUpdate(BaseModel):
    description: Optional[str] = None
    category: Optional[str] = None
    likelihood: Optional[int] = None
    impact: Optional[int] = None
    owner_name: Optional[str] = None
    mitigation_plan: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None

    @field_validator("likelihood", "impact", mode="before")
    @classmethod
    def validate_rating(cls, v):
        if v is not None and not (1 <= int(v) <= 5):
            raise ValueError("Must be between 1 and 5")
        return int(v) if v is not None else v


class StatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        valid = {"Identified", "Under Mitigation", "Resolved"}
        if v not in valid:
            raise ValueError(f"Status must be one of {valid}")
        return v


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str
    department_id: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v not in {"super_admin", "admin", "department_user"}:
            raise ValueError("Role must be super_admin, admin, or department_user")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    department_id: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v is not None and v not in {"super_admin", "admin", "department_user"}:
            raise ValueError("Role must be super_admin, admin, or department_user")
        return v


class DepartmentCreate(BaseModel):
    name: str
    code: str


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None


class SuggestTagsRequest(BaseModel):
    description: str


# ---------------------------------------------------------------------------
# Routes — Root
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"message": "ERIMP API", "version": "2.0"}


@app.get("/categories")
def get_categories(user: AuthUser = Depends(verify_token)):
    return {"categories": RISK_CATEGORIES}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@app.get("/me")
def get_current_user_profile(user: AuthUser = Depends(verify_token)):
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "department_id": user.department_id,
        "department_name": user.department_name,
        "department_code": user.department_code,
    }

@app.post("/auth/login")
def login(data: LoginRequest):
    import traceback

    # ── Step 1: Authenticate with Supabase ───────────────────────────────────
    try:
        res = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
    except Exception as e:
        print(f"[LOGIN] Step 1 FAILED – Supabase auth error: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(400, f"Authentication failed: {str(e)}")

    if not res.user or not res.session:
        print(f"[LOGIN] Step 1 FAILED – No user/session returned (bad credentials?)")
        raise HTTPException(400, "Invalid email or password")

    user_id = str(res.user.id)
    print(f"[LOGIN] Step 1 OK – user_id={user_id}")

    # ── Step 2: Fetch user profile ────────────────────────────────────────────
    try:
        profile_res = supabase_admin.table("profiles").select(
            "*, departments(name, code)"
        ).eq("id", user_id).limit(1).execute()
    except Exception as e:
        print(f"[LOGIN] Step 2 FAILED – profile query error: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(500, f"Database error: {str(e)}")

    if not profile_res.data:
        print(f"[LOGIN] Step 2 FAILED – No profiles row for user_id={user_id}")
        print("[LOGIN] Hint: Run the SQL schema in Supabase to create the profiles table with the correct columns.")
        raise HTTPException(400, "User profile not found. Ask your administrator to create your ERIMP profile.")

    p = profile_res.data[0]
    dept = p.get("departments") or {}
    print(f"[LOGIN] Step 2 OK – role={p.get('role')}, dept={dept.get('name')}")

    # ── Step 3: Audit + return ─────────────────────────────────────────────────
    log_audit(
        AuthUser(user_id, res.user.email, p.get("role", "department_user"),
                 p.get("department_id"), p.get("full_name", "")),
        "LOGIN", "auth", user_id
    )
    return {
        "access_token": res.session.access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": res.user.email,
            "full_name": p.get("full_name", ""),
            "role": p.get("role", "department_user"),
            "department_id": p.get("department_id"),
            "department_name": dept.get("name"),
            "department_code": dept.get("code"),
        }
    }


# ---------------------------------------------------------------------------
# Departments
# ---------------------------------------------------------------------------

@app.get("/departments")
def list_departments(user: AuthUser = Depends(verify_token)):
    depts = supabase_admin.table("departments").select("*").order("name").execute()
    result = []
    for d in (depts.data or []):
        risks_res = supabase_admin.table("risks").select(
            "id, risk_rating, status"
        ).eq("department_id", d["id"]).execute()
        risks = risks_res.data or []
        result.append({
            **d,
            "total_risks": len(risks),
            "critical_count": sum(1 for r in risks if r.get("risk_rating") == "Critical"),
            "high_count": sum(1 for r in risks if r.get("risk_rating") == "High"),
            "resolved_count": sum(1 for r in risks if r.get("status") == "Resolved"),
        })
    return result


@app.post("/departments")
def create_department(data: DepartmentCreate, user: AuthUser = Depends(require_super_admin)):
    try:
        result = supabase_admin.table("departments").insert({
            "name": data.name.strip(),
            "code": data.code.strip().upper(),
        }).execute()
        if not result.data:
            raise HTTPException(500, "Failed to create department")
        log_audit(user, "CREATE_DEPARTMENT", "departments", result.data[0]["id"],
                  new_value={"name": data.name, "code": data.code})
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to create department: {str(e)}")


@app.put("/departments/{dept_id}")
def update_department(dept_id: str, data: DepartmentUpdate, user: AuthUser = Depends(require_super_admin)):
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if "code" in updates:
        updates["code"] = updates["code"].strip().upper()
    if not updates:
        raise HTTPException(400, "No fields to update")
    try:
        result = supabase_admin.table("departments").update(updates).eq("id", dept_id).execute()
        if not result.data:
            raise HTTPException(404, "Department not found")
        log_audit(user, "UPDATE_DEPARTMENT", "departments", dept_id, new_value=updates)
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to update department: {str(e)}")


@app.delete("/departments/{dept_id}")
def delete_department(dept_id: str, user: AuthUser = Depends(require_super_admin)):
    # Check no active risks
    risks = supabase_admin.table("risks").select("id").eq("department_id", dept_id).limit(1).execute()
    if risks.data:
        raise HTTPException(400, "Cannot delete department with existing risks. Remove all risks first.")
    try:
        supabase_admin.table("departments").delete().eq("id", dept_id).execute()
        log_audit(user, "DELETE_DEPARTMENT", "departments", dept_id)
        return {"deleted": True}
    except Exception as e:
        raise HTTPException(400, f"Failed to delete department: {str(e)}")


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@app.get("/users")
def list_users(user: AuthUser = Depends(require_admin)):
    q = supabase_admin.table("profiles").select("*, departments(name, code)")
    # Admins only see department_user accounts; super_admin sees everyone
    if user.role == "admin":
        q = q.eq("role", "department_user")
    result = q.order("created_at", desc=True).execute()
    return result.data or []


@app.post("/users")
def create_user(data: UserCreate, user: AuthUser = Depends(require_admin)):
    try:
        # Create Supabase auth user
        auth_res = supabase_admin.auth.admin.create_user({
            "email": data.email,
            "password": data.password,
            "email_confirm": True,
        })
        new_id = str(auth_res.user.id)
        # Insert profile
        supabase_admin.table("profiles").insert({
            "id": new_id,
            "email": data.email,
            "full_name": data.full_name,
            "role": data.role,
            "department_id": data.department_id,
        }).execute()
        log_audit(user, "CREATE_USER", "profiles", new_id,
                  new_value={"email": data.email, "full_name": data.full_name, "role": data.role})
        return {"id": new_id, "email": data.email, "full_name": data.full_name, "role": data.role}
    except Exception as e:
        raise HTTPException(400, f"Failed to create user: {str(e)}")


@app.put("/users/{user_id}")
def update_user(user_id: str, data: UserUpdate, user: AuthUser = Depends(require_admin)):
    if user_id == user.id:
        raise HTTPException(400, "Cannot edit your own account via this endpoint")
    # Admins cannot promote to admin/super_admin
    if user.role == "admin" and data.role in {"admin", "super_admin"}:
        raise HTTPException(403, "Admins cannot assign admin or super_admin roles")
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
    if not updates:
        raise HTTPException(400, "No fields to update")
    try:
        result = supabase_admin.table("profiles").update(updates).eq("id", user_id).execute()
        if not result.data:
            raise HTTPException(404, "User not found")
        log_audit(user, "UPDATE_USER", "profiles", user_id, new_value=updates)
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to update user: {str(e)}")


@app.delete("/users/{user_id}")
def delete_user(user_id: str, user: AuthUser = Depends(require_admin)):
    if user_id == user.id:
        raise HTTPException(400, "Cannot delete your own account")
    try:
        supabase_admin.auth.admin.delete_user(user_id)
        log_audit(user, "DELETE_USER", "profiles", user_id)
        return {"deleted": True}
    except Exception as e:
        raise HTTPException(400, f"Failed to delete user: {str(e)}")


# ---------------------------------------------------------------------------
# Risks
# ---------------------------------------------------------------------------

@app.get("/risks")
def list_risks(
    dept_id: Optional[str] = None,
    status: Optional[str] = None,
    rating: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user: AuthUser = Depends(verify_token),
):
    q = supabase_admin.table("risks").select("*, departments(name, code)")

    # Department scoping
    if user.role == "department_user":
        if not user.department_id:
            return {"risks": [], "total": 0, "page": page, "page_size": page_size}
        q = q.eq("department_id", user.department_id)
    elif dept_id:
        q = q.eq("department_id", dept_id)

    if status:
        q = q.eq("status", status)
    if rating:
        q = q.eq("risk_rating", rating)

    q = q.order("created_at", desc=True)
    result = q.execute()
    risks = result.data or []

    # Search filter (post-query for simplicity)
    if search:
        s = search.lower()
        risks = [r for r in risks if s in r.get("description", "").lower()
                 or s in r.get("risk_code", "").lower()
                 or s in (r.get("owner_name") or "").lower()]

    total = len(risks)
    start = (page - 1) * page_size
    paginated = risks[start:start + page_size]

    return {
        "risks": paginated,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@app.post("/risks")
def create_risk(data: RiskCreate, user: AuthUser = Depends(verify_token)):
    # Determine department
    if user.role == "admin":
        dept_id = data.department_id
        if not dept_id:
            raise HTTPException(400, "Admin must specify department_id")
    else:
        dept_id = user.department_id
        if not dept_id:
            raise HTTPException(400, "User has no department assigned")

    # Get dept code for risk_code generation
    dept_res = supabase_admin.table("departments").select("code").eq(
        "id", dept_id
    ).limit(1).execute()
    if not dept_res.data:
        raise HTTPException(404, "Department not found")
    dept_code = dept_res.data[0]["code"]

    risk_code = generate_risk_code(dept_code, dept_id)

    row = {
        "risk_code": risk_code,
        "department_id": dept_id,
        "description": data.description,
        "category": data.category,
        "tags": data.tags or [],
        "likelihood": data.likelihood,
        "impact": data.impact,
        "owner_id": user.id,
        "owner_name": data.owner_name or user.full_name,
        "status": data.status or "Identified",
        "mitigation_plan": data.mitigation_plan,
    }

    result = supabase_admin.table("risks").insert(row).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create risk")
    risk = result.data[0]
    log_audit(user, "CREATE_RISK", "risks", risk["id"], new_value=row)
    return risk


@app.put("/risks/{risk_id}")
def update_risk(risk_id: str, data: RiskUpdate, user: AuthUser = Depends(verify_token)):
    # Fetch existing
    existing_res = supabase_admin.table("risks").select("*").eq(
        "id", risk_id
    ).limit(1).execute()
    if not existing_res.data:
        raise HTTPException(404, "Risk not found")
    existing = existing_res.data[0]

    # Access control
    if user.role == "department_user":
        if existing.get("department_id") != user.department_id:
            raise HTTPException(403, "Access denied")

    updates = data.model_dump(exclude_unset=True)
    old_value = {k: existing.get(k) for k in updates}

    result = supabase_admin.table("risks").update(updates).eq("id", risk_id).execute()
    if not result.data:
        raise HTTPException(500, "Failed to update risk")
    updated = result.data[0]
    log_audit(user, "UPDATE_RISK", "risks", risk_id, old_value=old_value, new_value=updates)
    return updated


@app.delete("/risks/{risk_id}")
def delete_risk(risk_id: str, user: AuthUser = Depends(verify_token)):
    existing_res = supabase_admin.table("risks").select("*").eq(
        "id", risk_id
    ).limit(1).execute()
    if not existing_res.data:
        raise HTTPException(404, "Risk not found")
    existing = existing_res.data[0]

    if user.role == "department_user":
        if existing.get("department_id") != user.department_id:
            raise HTTPException(403, "Access denied")

    supabase_admin.table("risks").delete().eq("id", risk_id).execute()
    log_audit(user, "DELETE_RISK", "risks", risk_id, old_value=existing)
    return {"deleted": True}


@app.patch("/risks/{risk_id}/status")
def update_risk_status(risk_id: str, data: StatusUpdate, user: AuthUser = Depends(verify_token)):
    existing_res = supabase_admin.table("risks").select(
        "id, department_id, status"
    ).eq("id", risk_id).limit(1).execute()
    if not existing_res.data:
        raise HTTPException(404, "Risk not found")
    existing = existing_res.data[0]

    if user.role == "department_user":
        if existing.get("department_id") != user.department_id:
            raise HTTPException(403, "Access denied")

    old_status = existing.get("status")
    result = supabase_admin.table("risks").update({"status": data.status}).eq(
        "id", risk_id
    ).execute()
    if not result.data:
        raise HTTPException(500, "Failed to update status")
    log_audit(user, "UPDATE_STATUS", "risks", risk_id,
              old_value={"status": old_status}, new_value={"status": data.status})
    return result.data[0]


# ---------------------------------------------------------------------------
# Auto-tagging
# ---------------------------------------------------------------------------

@app.post("/risks/suggest-tags")
def suggest_tags_endpoint(data: SuggestTagsRequest, user: AuthUser = Depends(verify_token)):
    return {"tags": suggest_tags(data.description)}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

def _get_risks_for_user(user: AuthUser, dept_id: Optional[str] = None):
    q = supabase_admin.table("risks").select("*")
    if user.role == "department_user":
        if not user.department_id:
            return []
        q = q.eq("department_id", user.department_id)
    elif dept_id:
        q = q.eq("department_id", dept_id)
    return q.execute().data or []


@app.get("/dashboard/summary")
def dashboard_summary(
    dept_id: Optional[str] = None,
    user: AuthUser = Depends(verify_token)
):
    risks = _get_risks_for_user(user, dept_id)
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    this_week = sum(1 for r in risks if r.get("created_at") and
                    datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")) >= week_ago)
    last_week = sum(1 for r in risks if r.get("created_at") and
                    two_weeks_ago <= datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")) < week_ago)

    return {
        "total_risks": len(risks),
        "critical_count": sum(1 for r in risks if r.get("risk_rating") == "Critical"),
        "high_count": sum(1 for r in risks if r.get("risk_rating") == "High"),
        "under_mitigation_count": sum(1 for r in risks if r.get("status") == "Under Mitigation"),
        "resolved_count": sum(1 for r in risks if r.get("status") == "Resolved"),
        "identified_count": sum(1 for r in risks if r.get("status") == "Identified"),
        "risk_velocity": {"this_week": this_week, "last_week": last_week},
    }


@app.get("/dashboard/by-department")
def dashboard_by_department(user: AuthUser = Depends(verify_token)):
    if user.role not in {"admin", "super_admin"}:
        raise HTTPException(403, "Admin only")
    depts = supabase_admin.table("departments").select("id, name, code").order("name").execute().data or []
    result = []
    for d in depts:
        risks = supabase_admin.table("risks").select(
            "risk_rating, status"
        ).eq("department_id", d["id"]).execute().data or []
        result.append({
            "dept_name": d["name"],
            "dept_code": d["code"],
            "total": len(risks),
            "critical": sum(1 for r in risks if r.get("risk_rating") == "Critical"),
            "high": sum(1 for r in risks if r.get("risk_rating") == "High"),
            "tolerable": sum(1 for r in risks if r.get("risk_rating") == "Tolerable"),
            "low": sum(1 for r in risks if r.get("risk_rating") == "Low"),
            "resolved": sum(1 for r in risks if r.get("status") == "Resolved"),
        })
    return result


@app.get("/dashboard/heatmap")
def dashboard_heatmap(
    dept_id: Optional[str] = None,
    user: AuthUser = Depends(verify_token)
):
    risks = _get_risks_for_user(user, dept_id)
    cells = []
    count_map = defaultdict(int)
    for r in risks:
        l = r.get("likelihood")
        i = r.get("impact")
        if l and i:
            count_map[f"{l}-{i}"] += 1
    for l in range(1, 6):
        for i in range(1, 6):
            cells.append({
                "likelihood": l,
                "impact": i,
                "count": count_map.get(f"{l}-{i}", 0),
                "score": l * i,
                "rating": score_to_rating(l * i),
            })
    return cells


@app.get("/dashboard/trend")
def dashboard_trend(
    days: int = Query(30, ge=7, le=90),
    dept_id: Optional[str] = None,
    user: AuthUser = Depends(verify_token)
):
    risks = _get_risks_for_user(user, dept_id)
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)

    count_by_day = defaultdict(int)
    for r in risks:
        ts = r.get("created_at")
        if ts:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            if dt >= cutoff:
                day_str = dt.strftime("%Y-%m-%d")
                count_by_day[day_str] += 1

    result = []
    for i in range(days):
        day = (now - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        result.append({"date": day, "count": count_by_day.get(day, 0)})
    return result


@app.get("/dashboard/by-category")
def dashboard_by_category(
    dept_id: Optional[str] = None,
    user: AuthUser = Depends(verify_token)
):
    risks = _get_risks_for_user(user, dept_id)
    cat_map = defaultdict(int)
    for r in risks:
        cat = r.get("category") or "Other"
        cat_map[cat] += 1
    return [{"category": k, "count": v} for k, v in sorted(cat_map.items(), key=lambda x: -x[1])]


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------

@app.get("/audit")
def get_audit_log(
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    user: AuthUser = Depends(require_admin),
):
    q = supabase_admin.table("audit_log").select("*").order("created_at", desc=True)
    if action:
        q = q.eq("action", action)
    if user_id:
        q = q.eq("user_id", user_id)
    if from_date:
        q = q.gte("created_at", from_date)
    if to_date:
        q = q.lte("created_at", to_date)

    result = q.execute()
    logs = result.data or []
    total = len(logs)
    start = (page - 1) * page_size
    return {
        "logs": logs[start:start + page_size],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


if __name__ == "__main__":
    import uvicorn
    # Use string reference for reload to work correctly
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
