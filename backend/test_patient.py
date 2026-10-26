import urllib.request
import json

# Login
login_data = json.dumps({'email': 'admin@medstore.local', 'password': 'Admin123!'}).encode()
req = urllib.request.Request('http://localhost:8001/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as resp:
    login_resp = json.load(resp)
    print(f"Login response: {json.dumps(login_resp, indent=2)}")
    token = login_resp.get('token', {}).get('access_token')
print(f"Token: {token[:20]}...")

# Create patient
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
patient_data = json.dumps({
    'full_name': 'Test Pasien',
    'birth_date': '1990-01-01',
    'gender': 'M',
    'medical_record_no': 'RM-TEST-003'
}).encode()
req = urllib.request.Request('http://localhost:8001/patients', data=patient_data, headers=headers, method='POST')
try:
    with urllib.request.urlopen(req) as resp:
        print(f"Status: {resp.status}")
        print(f"Response: {json.loads(resp.read().decode())}")
except urllib.error.HTTPError as e:
    print(f"Status: {e.code}")
    print(f"Response: {e.read().decode()}")