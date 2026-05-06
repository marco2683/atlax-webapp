import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'webapp', '.env'))

url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not url or not key:
    print("Missing credentials")
    exit(1)

supabase: Client = create_client(url, key)
buckets = supabase.storage.list_buckets()
for b in buckets:
    print(b.name)
