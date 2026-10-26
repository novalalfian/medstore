import httpx

# Test TrueNAS at 192.168.1.10
url = "http://192.168.1.10"
headers = {"Authorization": "Bearer 1-dZNumi41Zobd50Q5aSGqfFxw4mZIYXJkP9ryLv3yASPddwQPbg1F1sKjZNhUNXe5"}

client = httpx.Client(timeout=10, verify=False)

# Test root
try:
    r = client.get(url)
    print(f"Root: {r.status_code}")
    # Check for version in HTML
    import re
    match = re.search(r'TrueNAS.*?([0-9]+\.[0-9]+)', r.text)
    if match:
        print(f"Version found: {match.group(0)}")
except Exception as e:
    print(f"Root error: {e}")

# Test API base
try:
    r = client.get(f"{url}/api/v2.0")
    print(f"API v2.0 base: {r.status_code}")
except Exception as e:
    print(f"API base error: {e}")

# Test various endpoints
endpoints = [
    "/api/v2.0/system/info",
    "/api/v2.0/system/version", 
    "/api/v2.0/system/general",
    "/api/v2.0/pool",
    "/api/v2.0/zpool",
    "/api/v2.0/system",
]

for ep in endpoints:
    try:
        r = client.get(f"{url}{ep}", headers=headers)
        print(f"{ep}: {r.status_code}")
        if r.status_code == 200:
            print(f"  Response: {r.json()}")
    except Exception as e:
        print(f"{ep}: ERROR - {e}")

# Try JSON-RPC WebSocket endpoint
try:
    r = client.post(f"{url}/api/v2.0/rpc", json={"method": "system.general", "params": [], "id": 1}, headers=headers)
    print(f"RPC system.general: {r.status_code}")
    if r.status_code == 200:
        print(f"  Response: {r.json()}")
except Exception as e:
    print(f"RPC error: {e}")