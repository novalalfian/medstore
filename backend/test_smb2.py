from pathlib import Path

p = Path(r'\\10.18.143.43\clinical')
print('exists:', p.exists())
print('is_dir:', p.is_dir())
f = p / '__test__.txt'
f.write_text('ok')
print('write ok:', f.read_text())
f.unlink()
print('SMB OK')