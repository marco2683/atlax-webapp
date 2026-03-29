"""
Verify Supabase tables exist and backfill existing users' profiles.
Uses the service role key to bypass RLS.
"""
import os, requests
from dotenv import load_dotenv

# Load from root .env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Try webapp/.env as fallback
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'webapp', '.env'))

SUPABASE_URL = "https://qvxrwbcmyrugjevgvujb.supabase.co"
SERVICE_KEY  = "YOUR_SUPABASE_SERVICE_ROLE_KEY"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json"
}

def check_tables():
    """Verify the tables were created."""
    tables = ['profiles', 'shortlists', 'rfq_history']
    print("=== Checking tables ===")
    for table in tables:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?limit=1", headers=headers)
        if r.status_code == 200:
            count = len(r.json())
            print(f"  ✅ {table} — OK (rows visible: {count})")
        else:
            print(f"  ❌ {table} — ERROR {r.status_code}: {r.text}")
    print()

def get_all_users():
    """Fetch all users from auth (service role only)."""
    r = requests.get(f"{SUPABASE_URL}/auth/v1/admin/users", headers=headers)
    if r.status_code != 200:
        print(f"❌ Could not fetch users: {r.status_code} {r.text}")
        return []
    data = r.json()
    users = data.get('users', [])
    print(f"=== Found {len(users)} user(s) in auth ===")
    for u in users:
        meta = u.get('user_metadata', {})
        print(f"  - {u['email']} | id={u['id'][:8]}... | meta={meta}")
    print()
    return users

def backfill_profiles(users):
    """Insert a profile row for any user that doesn't have one yet."""
    print("=== Backfilling profiles ===")
    
    # Get existing profile IDs
    r = requests.get(f"{SUPABASE_URL}/rest/v1/profiles?select=id", headers=headers)
    existing_ids = {p['id'] for p in r.json()} if r.status_code == 200 else set()

    for u in users:
        uid = u['id']
        if uid in existing_ids:
            print(f"  ⏭  {u['email']} — profile already exists")
            continue

        meta = u.get('user_metadata', {})
        payload = {
            "id": uid,
            "first_name": meta.get('first_name', ''),
            "last_name":  meta.get('last_name', ''),
            "company":    meta.get('company', ''),
        }
        ins = requests.post(
            f"{SUPABASE_URL}/rest/v1/profiles",
            json=payload,
            headers={**headers, "Prefer": "return=representation"}
        )
        if ins.status_code in (200, 201):
            print(f"  ✅ {u['email']} — profile created")
        else:
            print(f"  ❌ {u['email']} — failed: {ins.status_code} {ins.text}")
    print()

if __name__ == "__main__":
    check_tables()
    users = get_all_users()
    if users:
        backfill_profiles(users)
    print("Done.")
