"""One-time script to create the super_admin account."""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase_admin = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY"),
)

EMAIL = "charlesjeffwanakamondo@gmail.com"
PASSWORD = "Admin@123"
FULL_NAME = "Charles Jeff Wanakamondo"
ROLE = "super_admin"

# 1. Create auth user
try:
    auth_res = supabase_admin.auth.admin.create_user({
        "email": EMAIL,
        "password": PASSWORD,
        "email_confirm": True,
    })
    user_id = str(auth_res.user.id)
    print(f"[OK] Auth user created: {user_id}")
except Exception as e:
    if "already been registered" in str(e) or "already exists" in str(e):
        # User exists — fetch their ID
        users = supabase_admin.auth.admin.list_users()
        match = next((u for u in users if u.email == EMAIL), None)
        if not match:
            print(f"[ERROR] User exists but could not find ID: {e}")
            exit(1)
        user_id = str(match.id)
        print(f"[OK] Auth user already exists: {user_id}")
    else:
        print(f"[ERROR] Could not create auth user: {e}")
        exit(1)

# 2. Upsert profile
try:
    supabase_admin.table("profiles").upsert({
        "id": user_id,
        "email": EMAIL,
        "full_name": FULL_NAME,
        "role": ROLE,
        "department_id": None,
    }).execute()
    print(f"[OK] Profile upserted — role={ROLE}")
except Exception as e:
    print(f"[ERROR] Profile upsert failed: {e}")
    exit(1)

print(f"\nSuper admin account ready.")
print(f"  Email:    {EMAIL}")
print(f"  Password: {PASSWORD}")
print(f"  Role:     {ROLE}")
