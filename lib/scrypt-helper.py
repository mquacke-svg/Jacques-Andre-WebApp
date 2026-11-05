"""Fixed local scrypt adapter. Passwords arrive only through stdin, never argv/files."""
import base64
import hashlib
import json
import sys


def main():
    raw = sys.stdin.buffer.read(65537)
    if len(raw) > 65536:
        raise ValueError()
    data = json.loads(raw)
    if not isinstance(data, dict) or set(data) != {"password", "salt"}:
        raise ValueError()
    password = base64.b64decode(data["password"], validate=True)
    salt = base64.b64decode(data["salt"], validate=True)
    # Salt is the literal UTF-8 hex string, not decoded hex bytes (Better Auth).
    key = hashlib.scrypt(password, salt=salt, n=16384, r=16, p=1,
                         dklen=64, maxmem=128 * 1024 * 1024)
    sys.stdout.write(key.hex() + "\n")


try:
    main()
except Exception:
    # No exception details: malformed input must not leak password data into logs.
    sys.stderr.write("scrypt unavailable\n")
    sys.exit(1)
