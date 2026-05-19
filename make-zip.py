"""Fast project zipper — excludes build artifacts and large directories."""
import os
import zipfile
import time

SRC = r'D:\Personal\5rivers.app'
OUT = r'D:\Personal\5rivers.app\5Rivers.zip'

EXCLUDE_DIRS = {
    'node_modules', '.git', 'dist', '.vite', 'coverage',
    'archive', '.claude', '.codex', '.vs', '.vscode',
    '__pycache__',
}
EXCLUDE_FILES = {
    '5Rivers.zip', 'package-lock.json',
}
EXCLUDE_EXTS = {'.log', '.tmp'}

if os.path.exists(OUT):
    os.remove(OUT)

t0 = time.time()
count = 0
total_bytes = 0

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for dirpath, dirnames, filenames in os.walk(SRC):
        # Prune excluded directories in-place so os.walk skips them
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if fn in EXCLUDE_FILES:
                continue
            if any(fn.endswith(ext) for ext in EXCLUDE_EXTS):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, SRC)
            try:
                zf.write(full, rel)
                count += 1
                total_bytes += os.path.getsize(full)
            except (PermissionError, OSError) as e:
                print(f'skipped (locked): {rel}')

elapsed = time.time() - t0
size = os.path.getsize(OUT)
print(f'{count} files, {total_bytes/1e6:.1f} MB raw -> {size/1e6:.1f} MB zipped in {elapsed:.1f}s')
print(f'Output: {OUT}')
