from __future__ import annotations

import base64
import hashlib
import io
import tarfile
from pathlib import Path

EXPECTED_SHA256 = "e1bf0047230ac1a02eab0f671dae9efc3791c647c1359fc5e3968e225aba8928"


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    parts_dir = root / "scripts" / "churvox_hardening_v8_parts"
    parts = sorted(parts_dir.glob("part_*"))
    if len(parts) != 9:
        raise RuntimeError(f"Expected 9 hardening bundle parts, found {len(parts)}")

    encoded = "".join(part.read_text(encoding="utf-8").strip() for part in parts)
    payload = base64.b64decode(encoded, validate=True)
    digest = hashlib.sha256(payload).hexdigest()
    if digest != EXPECTED_SHA256:
        raise RuntimeError(f"Hardening bundle checksum mismatch: {digest}")

    with tarfile.open(fileobj=io.BytesIO(payload), mode="r:gz") as archive:
        members = archive.getmembers()
        for member in members:
            target = (root / member.name).resolve()
            if target != root and root not in target.parents:
                raise RuntimeError(f"Unsafe bundle path: {member.name}")
        archive.extractall(root, filter="data")

    print(f"Materialised {len(members)} Churvox hardening files ({digest[:12]}).")


if __name__ == "__main__":
    main()
