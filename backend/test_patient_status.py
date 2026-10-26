import httpx

client = httpx.Client(timeout=30)
r = client.post('http://localhost:8001/auth/login', json={'email': 'admin@medstore.local', 'password': 'Admin123!'})
token = r.json()['token']['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Get patient
r = client.get('http://localhost:8001/patients', headers=headers)
patient_id = r.json()['items'][0]['id']
print(f'Patient ID: {patient_id}')

# Archive patient
r = client.put(f'http://localhost:8001/patients/{patient_id}', json={'is_active': False}, headers=headers)
print(f'Archive: {r.status_code}, is_active: {r.json().get("is_active")}')

# Activate patient
r = client.put(f'http://localhost:8001/patients/{patient_id}', json={'is_active': True}, headers=headers)
print(f'Activate: {r.status_code}, is_active: {r.json().get("is_active")}')