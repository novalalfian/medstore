import httpx

# Test endpoints
client = httpx.Client(timeout=30)

# Login
login_data = {"email": "admin@medstore.local", "password": "Admin123!"}
r = client.post("http://localhost:8001/auth/login", json=login_data)
token = r.json()["token"]["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"Login: {r.status_code}")

# Test batch upload endpoint (should fail without files but shouldn't 500)
r = client.post("http://localhost:8001/documents/batch/upload", headers=headers)
print(f"Batch upload (no files): {r.status_code} - {r.text[:100]}")

# Test batch delete endpoint
r = client.post("http://localhost:8001/documents/batch/delete", json=[], headers=headers)
print(f"Batch delete: {r.status_code} - {r.text[:100]}")

# Test batch download endpoint
r = client.post("http://localhost:8001/documents/batch/download", json=[], headers=headers)
print(f"Batch download: {r.status_code} - {r.text[:100]}")

# Test retention dashboard
r = client.get("http://localhost:8001/admin/retention-dashboard", headers=headers)
print(f"Retention dashboard: {r.status_code} - {r.text[:200]}")

# Test patient timeline
r = client.get("http://localhost:8001/patients/8c203ecf-c6a8-4e97-a3f7-f69d98b0385f/timeline", headers=headers)
print(f"Patient timeline: {r.status_code} - {r.text[:200]}")

# Test DICOM metadata endpoint (with non-existent doc)
r = client.get("http://localhost:8001/documents/00000000-0000-0000-0000-000000000000/dicom/metadata", headers=headers)
print(f"DICOM metadata (not found): {r.status_code}")