"""
Apply SQL statements one at a time via Supabase Management API
"""
import sys
import json
import requests

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://qvxrwbcmyrugjevgvujb.supabase.co'
SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'
PROJECT_REF = 'qvxrwbcmyrugjevgvujb'

HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
}


def run_sql(sql, label):
    """Execute a single SQL statement via Management API"""
    resp = requests.post(
        f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query',
        headers={
            'Authorization': f'Bearer {SERVICE_KEY}',
            'Content-Type': 'application/json',
        },
        json={'query': sql.strip()}
    )
    
    if resp.status_code in (200, 201):
        print(f"  [OK] {label}")
        return True
    else:
        try:
            err = resp.json()
            msg = err.get('message', err.get('error', str(err)))
        except:
            msg = resp.text[:200]
        print(f"  [ERR] {label}: {resp.status_code} - {msg}")
        return False


if __name__ == '__main__':
    print("\n" + "="*60)
    print("  APPLYING SQL STATEMENTS ONE BY ONE")
    print("="*60)
    
    # First test connectivity
    resp = requests.post(
        f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query',
        headers={
            'Authorization': f'Bearer {SERVICE_KEY}',
            'Content-Type': 'application/json',
        },
        json={'query': 'SELECT current_user, current_database()'}
    )
    print(f"\n  Test query: {resp.status_code}")
    if resp.status_code == 200:
        print(f"  Result: {resp.text[:200]}")
    else:
        print(f"  Error: {resp.text[:200]}")
        # If management API doesn't work, output instructions
        print("\n  Management API not available with service key.")
        print("  Let's try PostgREST directly...\n")
        
        # Check what functions are available
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/',
            headers=HEADERS
        )
        print(f"  PostgREST root: {resp.status_code}")
        
        # Try the pg endpoint
        for path in ['/pg/query', '/pg-meta/default/query']:
            resp = requests.post(
                f'{SUPABASE_URL}{path}',
                headers=HEADERS,
                json={'query': 'SELECT 1 as test'}
            )
            print(f"  {path}: {resp.status_code} - {resp.text[:150]}")
            if resp.status_code == 200:
                print(f"\n  [OK] Found working endpoint: {path}")
                
                # Now apply each SQL statement
                statements = [
                    ("Drop old policies", """
                        DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
                        DROP POLICY IF EXISTS "Public read access for user-files" ON storage.objects;
                        DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
                        DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
                        DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
                        DROP POLICY IF EXISTS "Authenticated users can view own files" ON storage.objects;
                        DROP POLICY IF EXISTS "Authenticated users can update own files" ON storage.objects;
                        DROP POLICY IF EXISTS "Authenticated users can delete own files" ON storage.objects;
                        DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
                        DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
                        DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
                    """),
                    ("INSERT policy", """
                        CREATE POLICY "Users can upload to own folder"
                        ON storage.objects FOR INSERT TO authenticated
                        WITH CHECK (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);
                    """),
                    ("SELECT policy", """
                        CREATE POLICY "Public read access for user-files"
                        ON storage.objects FOR SELECT TO public
                        USING (bucket_id = 'user-files');
                    """),
                    ("UPDATE policy", """
                        CREATE POLICY "Users can update own files"
                        ON storage.objects FOR UPDATE TO authenticated
                        USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);
                    """),
                    ("DELETE policy", """
                        CREATE POLICY "Users can delete own files"
                        ON storage.objects FOR DELETE TO authenticated
                        USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);
                    """),
                    ("Category constraint - drop", """
                        ALTER TABLE public.user_files DROP CONSTRAINT IF EXISTS user_files_category_check;
                    """),
                    ("Category constraint - create", """
                        ALTER TABLE public.user_files ADD CONSTRAINT user_files_category_check
                        CHECK (category IN ('cad', 'drawing', 'specification', 'nda', 'certificate', 'general', 'doc', 'image'));
                    """),
                    ("Cleanup orphaned records", """
                        DELETE FROM public.user_files WHERE storage_path IS NULL;
                    """),
                ]
                
                ok = 0
                err_count = 0
                for label, sql in statements:
                    resp = requests.post(
                        f'{SUPABASE_URL}{path}',
                        headers=HEADERS,
                        json={'query': sql.strip()}
                    )
                    if resp.status_code == 200:
                        print(f"  [OK] {label}")
                        ok += 1
                    else:
                        try:
                            msg = resp.json().get('message', resp.text[:100])
                        except:
                            msg = resp.text[:100]
                        
                        # "already exists" is fine
                        if 'already exists' in str(msg):
                            print(f"  [OK] {label} (already existed)")
                            ok += 1
                        else:
                            print(f"  [ERR] {label}: {msg}")
                            err_count += 1
                
                print(f"\n  Results: {ok} succeeded, {err_count} failed")
                
                # Verify policies
                resp = requests.post(
                    f'{SUPABASE_URL}{path}',
                    headers=HEADERS,
                    json={'query': "SELECT policyname, cmd FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE '%user%' OR policyname LIKE '%Public%'"}
                )
                if resp.status_code == 200:
                    print(f"\n  Policies: {resp.text[:500]}")
                
                break
        else:
            print("\n  [!!] No SQL endpoint found. Manual SQL execution required.")
        
        sys.exit(0)
    
    # If management API works, apply statements
    statements = [
        ("Drop old policies", """
            DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
            DROP POLICY IF EXISTS "Public read access for user-files" ON storage.objects;
            DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
            DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
        """),
        ("Insert policy", """
            CREATE POLICY "Users can upload to own folder"
            ON storage.objects FOR INSERT TO authenticated
            WITH CHECK (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);
        """),
        ("Select policy", """
            CREATE POLICY "Public read access for user-files"
            ON storage.objects FOR SELECT TO public
            USING (bucket_id = 'user-files');
        """),
        ("Update policy", """
            CREATE POLICY "Users can update own files"
            ON storage.objects FOR UPDATE TO authenticated
            USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);
        """),
        ("Delete policy", """
            CREATE POLICY "Users can delete own files"
            ON storage.objects FOR DELETE TO authenticated
            USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);
        """),
        ("Category fix", """
            ALTER TABLE public.user_files DROP CONSTRAINT IF EXISTS user_files_category_check;
            ALTER TABLE public.user_files ADD CONSTRAINT user_files_category_check
            CHECK (category IN ('cad','drawing','specification','nda','certificate','general','doc','image'));
        """),
        ("Cleanup", "DELETE FROM public.user_files WHERE storage_path IS NULL;"),
    ]
    
    ok = 0
    for label, sql in statements:
        if run_sql(sql, label):
            ok += 1
    
    print(f"\n  Result: {ok}/{len(statements)} applied")
    print()
