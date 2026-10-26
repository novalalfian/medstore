import smbclient

# Try with domain in username (WORKGROUP\medstore_svc)
smbclient.register_session(
    '10.18.143.43',
    username='WORKGROUP\\medstore_svc',
    password='root1234',
    port=445,
    encrypt=False
)

with smbclient.open_file(r'\\10.18.143.43\clinical\__test__.txt', mode='wb') as f:
    f.write(b'ok')

with smbclient.open_file(r'\\10.18.143.43\clinical\__test__.txt', mode='rb') as f:
    print('Read:', f.read())

smbclient.remove(r'\\10.18.143.43\clinical\__test__.txt')
print('SMB Python OK')