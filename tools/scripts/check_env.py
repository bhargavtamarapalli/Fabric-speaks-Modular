import os
import re
from pathlib import Path

def get_env_vars(file_path):
    if not os.path.exists(file_path):
        return None
    vars = {}
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, value = line.split('=', 1)
                vars[key.strip()] = value.strip()
    return vars

def check_env():
    root_dir = Path(os.getcwd())
    
    locations = {
        "Root .env": root_dir / ".env",
        "Web App .env.local": root_dir / "apps" / "web" / ".env.local",
        "Auth Service .env": root_dir / "services" / "auth-service" / ".env"
    }
    
    print("\n🔍 Checking Environment Configuration...\n")
    
    all_vars = {}
    for name, path in locations.items():
        if path.exists():
            print(f"✅ Found {name} at {path}")
            all_vars[name] = get_env_vars(path)
        else:
            print(f"❌ Missing {name} at {path}")
            all_vars[name] = None

    # Check for Key Variables
    print("\n🔑 Verifying Critical Keys...")
    
    # 1. Web App Check
    web_env = all_vars.get("Web App .env.local")
    if web_env:
        required_web = [
            "NEXT_PUBLIC_FIREBASE_API_KEY",
            "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
            "NEXT_PUBLIC_FIREBASE_APP_ID"
        ]
        for var in required_web:
            val = web_env.get(var)
            if not val or "your-" in val.lower() or "placehold" in val.lower():
                print(f"⚠️  {var} in Web App might be invalid: '{val}'")
            else:
                print(f"✅ {var} is set")
                
    # 2. Auth Service Check
    auth_env = all_vars.get("Auth Service .env")
    if auth_env:
        required_auth = [
            "FIREBASE_PROJECT_ID",
            "FIREBASE_PRIVATE_KEY",
            "FIREBASE_CLIENT_EMAIL"
        ]
        for var in required_auth:
            val = auth_env.get(var)
            if not val:
                print(f"⚠️  {var} in Auth Service is MISSING")
            else:
                print(f"✅ {var} is set")

    # 3. Consistency Check
    print("\n⚖️  Checking Project Consistency...")
    web_pid = web_env.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID") if web_env else None
    auth_pid = auth_env.get("FIREBASE_PROJECT_ID") if auth_env else None
    
    if web_pid and auth_pid:
        if web_pid == auth_pid:
            print(f"✅ Project ID matches across Frontend and Backend: {web_pid}")
        else:
            print(f"❌ Project ID MISMATCH!")
            print(f"   Frontend: {web_pid}")
            print(f"   Backend:  {auth_pid}")
    
    # 4. JSON Private Key Format check
    if auth_env and auth_env.get("FIREBASE_PRIVATE_KEY"):
        key = auth_env.get("FIREBASE_PRIVATE_KEY")
        if "\\n" not in key and "\n" not in key:
            print("⚠️  Warning: FIREBASE_PRIVATE_KEY does not seem to contain newline markers (\\n). This might cause authentication to fail.")
        else:
            print("✅ FIREBASE_PRIVATE_KEY format looks okay (contains newlines).")

    print("\n✨ Check complete!\n")

if __name__ == "__main__":
    check_env()
