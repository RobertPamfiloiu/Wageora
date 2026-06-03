"""
Generate a self-signed TLS certificate for LAN HTTPS deployment.

Usage:
    python generate_cert.py

Outputs cert.pem and key.pem in the current directory.
Browsers will show a security warning — click Advanced → Proceed to accept the
self-signed certificate during the lab demo.
"""
from __future__ import annotations

import ipaddress
import socket
from datetime import datetime, timedelta, timezone

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID


def get_local_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def generate_cert(cert_path: str = "cert.pem", key_path: str = "key.pem") -> str:
    local_ip = get_local_ip()
    print(f"Detected LAN IP: {local_ip}")

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, local_ip),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Wageora Lab"),
    ])

    san_list = [
        x509.DNSName("localhost"),
        x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
    ]
    if local_ip != "127.0.0.1":
        san_list.append(x509.IPAddress(ipaddress.IPv4Address(local_ip)))

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(timezone.utc))
        .not_valid_after(datetime.now(timezone.utc) + timedelta(days=365))
        .add_extension(
            x509.SubjectAlternativeName(san_list),
            critical=False,
        )
        .sign(key, hashes.SHA256())
    )

    with open(cert_path, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))

    with open(key_path, "wb") as f:
        f.write(key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        ))

    print(f"Certificate → {cert_path}")
    print(f"Private key → {key_path}")
    print()
    print(f"  Backend HTTPS: https://{local_ip}:8000")
    print(f"  Frontend:      http://{local_ip}:5173  (set VITE_BACKEND_URL=https://{local_ip}:8000)")
    print()
    print("NOTE: Browsers will warn about the self-signed cert.")
    print("      Open https://{}:8000/api/health first and click Advanced → Proceed.".format(local_ip))
    return local_ip


if __name__ == "__main__":
    generate_cert()
