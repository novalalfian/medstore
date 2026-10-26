import httpx

client = httpx.Client(timeout=30)
r = client.post('http://localhost:8001/auth/login', json={'email': 'admin@medstore.local', 'password': 'Admin123!'})
token = r.json()['token']['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Test gender filter
r = client.get('http://localhost:8001/patients', params={'gender': 'M'}, headers=headers)
print(f'Gender filter M: {r.status_code}, count: {r.json()["total"]}')

r = client.get('http://localhost:8001/patients', params={'gender': 'F'}, headers=headers)
print(f'Gender filter F: {r.status_code}, count: {r.json()["total"]}')

# Test status filter
r = client.get('http://localhost:8001/patients', params={'status': 'active'}, headers=headers)
print(f'Status active: {r.status_code}, count: {r.json()["total"]}')

r = client.get('http://localhost:8001/patients', params={'status': 'inactive'}, headers=headers)
print(f'Status inactive: {r.status_code}, count: {r.json()["total"]}')

# Test audit log with user details
r = client.get('http://localhost:8001/audit', headers=headers)
data = r.json()
print(f'Audit log: {r.status_code}, count: {data["total"]}')
if data['items']:
    item = data['items'][0]
    print(f'  user_email: {item.get("user_email")}')
    print(f'  user_full_name: {item.get("user_full_name")}')

# Test batch download
r = client.post('http://localhost:8001/documents/batch/download', json=["16c28207-0634-474a-9690-54f2a978d08b"], headers=headers)
print(f'Batch download: {r.status_code}, content-type: {r.headers.get("content-type")}')