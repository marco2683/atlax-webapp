"""Quick verification: test storage + DB operations"""
import sys, requests, json
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

URL = 'https://qvxrwbcmyrugjevgvujb.supabase.co'
KEY = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}

# 1. Get user
r = requests.get(f'{URL}/auth/v1/admin/users?per_page=1', headers=H)
users = r.json().get('users', [])
if not users:
    print('[ERR] No users')
    sys.exit(1)
uid = users[0]['id']
email = users[0].get('email', 'unknown')
print(f'[OK] User: {email} ({uid})')

# 2. Storage upload
test_path = f'{uid}/test_verify.txt'
r = requests.post(
    f'{URL}/storage/v1/object/user-files/{test_path}',
    headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'text/plain'},
    data=b'storage test OK'
)
status = 'OK' if r.status_code in (200, 201) else 'ERR'
print(f'[{status}] Storage upload: {r.status_code}')
if r.status_code not in (200, 201):
    print(f'     Error: {r.text[:200]}')

# 3. Public read
pub = f'{URL}/storage/v1/object/public/user-files/{test_path}'
r = requests.get(pub)
status = 'OK' if r.status_code == 200 else 'ERR'
print(f'[{status}] Public read: {r.status_code} content="{r.text[:30]}"')

# 4. Storage delete
r = requests.delete(
    f'{URL}/storage/v1/object/user-files/{test_path}',
    headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'}
)
status = 'OK' if r.status_code in (200, 204) else 'ERR'
print(f'[{status}] Storage delete: {r.status_code}')

# 5. DB insert
r = requests.post(
    f'{URL}/rest/v1/user_files',
    headers={**H, 'Prefer': 'return=representation'},
    json={
        'user_id': uid, 'file_name': 'test.txt', 'file_type': 'txt',
        'file_size': 15, 'storage_path': test_path, 'category': 'general',
        'meta': {'test': True}
    }
)
if r.status_code in (200, 201):
    rec = r.json()
    if isinstance(rec, list):
        rec = rec[0]
    rec_id = rec.get('id', '?')
    print(f'[OK] DB insert: id={rec_id[:8]}...')
    # Cleanup
    requests.delete(
        f'{URL}/rest/v1/user_files?id=eq.{rec_id}',
        headers={**H, 'Prefer': 'return=minimal'}
    )
    print('[OK] DB cleanup done')
else:
    print(f'[ERR] DB insert: {r.status_code} {r.text[:200]}')

# 6. Check policies exist
print('\n--- Storage policies ---')
r = requests.get(f'{URL}/rest/v1/user_files?select=count', headers={**H, 'Prefer': 'count=exact'})
count_header = r.headers.get('content-range', 'unknown')
print(f'File records remaining: {count_header}')

print('\n=== ALL TESTS COMPLETE ===')
