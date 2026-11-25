#!/usr/bin/env bash
set -euo pipefail
# Retain the verified Ubuntu mirror workaround for runner-based installation.
# Container jobs use their preinstalled, version-matched browser instead.
sudo python3 - <<'PY'
from pathlib import Path
sources = [Path('/etc/apt/sources.list'), Path('/etc/apt/apt-mirrors.txt'),
           Path('/etc/apt/apt-mirrors-security.txt'),
           *Path('/etc/apt/sources.list.d').glob('ubuntu.sources')]
replacements = {
    'http://azure.archive.ubuntu.com/ubuntu': 'https://archive.ubuntu.com/ubuntu',
    'http://archive.ubuntu.com/ubuntu': 'https://archive.ubuntu.com/ubuntu',
    'http://security.ubuntu.com/ubuntu': 'https://security.ubuntu.com/ubuntu',
}
for source in sources:
    if source.is_file():
        original = source.read_text()
        updated = original
        for before, after in replacements.items():
            updated = updated.replace(before, after)
        if updated != original:
            source.write_text(updated)
PY
npx --no-install playwright install --with-deps chromium
