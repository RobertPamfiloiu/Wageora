"""
Start the Wageora backend over HTTPS.

1. Generates cert.pem / key.pem if they do not exist.
2. Launches uvicorn with SSL on port 8000, bound to all interfaces (0.0.0.0)
   so the server is reachable from any machine on the LAN.

Usage (from the backend/ directory):
    py start_https.py
"""
from __future__ import annotations

import os
import subprocess
import sys


def main() -> None:
    if not (os.path.exists("cert.pem") and os.path.exists("key.pem")):
        from generate_cert import generate_cert
        generate_cert()
    else:
        from generate_cert import get_local_ip
        ip = get_local_ip()
        print(f"Using existing cert.pem / key.pem")
        print(f"  Backend HTTPS: https://{ip}:8000")
        print(f"  Set on client: VITE_BACKEND_URL=https://{ip}:8000")

    subprocess.run(
        [
            sys.executable, "-m", "uvicorn", "main:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--ssl-keyfile", "key.pem",
            "--ssl-certfile", "cert.pem",
        ],
        check=False,
    )


if __name__ == "__main__":
    main()
