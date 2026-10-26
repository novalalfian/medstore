import httpx

# Test audit endpoint
client = httpx.Client(timeout=10)

# Login
login_data = {"email": "admin@medstore.local", "password": "Admin123!"}
r = client.post("http://localhost:8001/auth/login", json=login_data)
token = r.json()["token"]["access_token"]
print(f"Token: {token[:20]}...")

# Test audit
headers = {"Authorization": f"Bearer {token}"}
r = client.get("http://localhost:8001/audit", headers=headers)
print(f"Audit Status: {r.status_code}")
print(f"Audit Body: {r.text}")