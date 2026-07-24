from __future__ import annotations

import base64
import gzip
import hashlib
import io
import re
import tarfile
from pathlib import Path

EXPECTED_SHA256 = "e1bf0047230ac1a02eab0f671dae9efc3791c647c1359fc5e3968e225aba8928"
PATCH_SHA256 = "5622d422495b6f82c7d382588a450b8b1abb650cd840d247f4fdbba289c06c73"


def _apply_unified_patch(root: Path, patch_text: str) -> int:
    lines = patch_text.splitlines(keepends=True)
    index = 0
    changed = 0
    header = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@")
    while index < len(lines):
        if not lines[index].startswith("--- "):
            index += 1
            continue
        index += 1
        if index >= len(lines) or not lines[index].startswith("+++ "):
            raise RuntimeError("Malformed Churvox hardening patch")
        target_name = lines[index][4:].strip()
        if target_name.startswith("b/"):
            target_name = target_name[2:]
        target = (root / target_name).resolve()
        if target != root and root not in target.parents:
            raise RuntimeError(f"Unsafe patch path: {target_name}")
        source = target.read_text(encoding="utf-8").splitlines(keepends=True)
        output: list[str] = []
        cursor = 0
        index += 1
        while index < len(lines) and not lines[index].startswith("--- "):
            if not lines[index].startswith("@@ "):
                index += 1
                continue
            match = header.match(lines[index])
            if not match:
                raise RuntimeError(f"Malformed patch hunk for {target_name}")
            old_start = int(match.group(1)) - 1
            old_count = int(match.group(2) or "1")
            new_count = int(match.group(4) or "1")
            output.extend(source[cursor:old_start])
            cursor = old_start
            consumed_old = consumed_new = 0
            index += 1
            while consumed_old < old_count or consumed_new < new_count:
                if index >= len(lines):
                    raise RuntimeError(f"Truncated patch hunk for {target_name}")
                line = lines[index]
                if line.startswith("\\ No newline"):
                    index += 1
                    continue
                prefix, body = line[:1], line[1:]
                if prefix == " ":
                    if cursor >= len(source) or source[cursor] != body:
                        raise RuntimeError(f"Patch context mismatch in {target_name}")
                    output.append(body)
                    cursor += 1
                    consumed_old += 1
                    consumed_new += 1
                elif prefix == "-":
                    if cursor >= len(source) or source[cursor] != body:
                        raise RuntimeError(f"Patch removal mismatch in {target_name}")
                    cursor += 1
                    consumed_old += 1
                elif prefix == "+":
                    output.append(body)
                    consumed_new += 1
                else:
                    raise RuntimeError(f"Unexpected patch line in {target_name}: {line[:20]!r}")
                index += 1
        output.extend(source[cursor:])
        target.write_text("".join(output), encoding="utf-8")
        changed += 1
    return changed


def _apply_security_patch(root: Path) -> int:
    patch_path = root / "scripts" / "churvox_hardening_v8_security_patch.gz.b64"
    encoded = patch_path.read_text(encoding="utf-8").strip()
    compressed = base64.b64decode(encoded, validate=True)
    digest = hashlib.sha256(compressed).hexdigest()
    if digest != PATCH_SHA256:
        raise RuntimeError(f"Hardening patch checksum mismatch: {digest}")
    patch_text = gzip.decompress(compressed).decode("utf-8")
    return _apply_unified_patch(root, patch_text)


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
        archive.extractall(root)

    patched = _apply_security_patch(root)
    print(f"Materialised {len(members)} Churvox hardening files and patched {patched} safety-critical files ({digest[:12]}).")


if __name__ == "__main__":
    main()
