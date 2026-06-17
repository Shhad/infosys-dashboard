import base64
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from passlib.context import CryptContext

from .config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

_private_key = None
_public_key = None
_kid: str | None = None


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(password, password_hash)
    except ValueError:
        return False


def _b64url_uint(value: int) -> str:
    length = (value.bit_length() + 7) // 8
    return base64.urlsafe_b64encode(value.to_bytes(length, "big")).rstrip(b"=").decode()


def load_or_generate_keys() -> None:
    """Load the RS256 keypair from disk, or generate it once if absent.

    Generating only when missing means a key mounted/persisted via the shared
    `keys` volume survives restarts (so live tokens stay valid) and is readable
    by task-service for local validation (NFR-2).
    """
    global _private_key, _public_key, _kid

    priv_path = Path(settings.jwt_private_key_path)
    pub_path = Path(settings.jwt_public_key_path)

    if priv_path.exists() and pub_path.exists():
        _private_key = serialization.load_pem_private_key(
            priv_path.read_bytes(), password=None
        )
    else:
        _private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        priv_path.parent.mkdir(parents=True, exist_ok=True)
        pub_path.parent.mkdir(parents=True, exist_ok=True)
        priv_path.write_bytes(
            _private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            )
        )
        pub_path.write_bytes(
            _private_key.public_key().public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            )
        )

    _public_key = _private_key.public_key()

    der = _public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    digest = hashes.Hash(hashes.SHA256())
    digest.update(der)
    _kid = base64.urlsafe_b64encode(digest.finalize()).rstrip(b"=").decode()[:16]


def issue_token(sub: str, email: str, role: str) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    expires_in = settings.jwt_expires_in
    payload = {
        "sub": sub,
        "email": email,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in)).timestamp()),
    }
    token = jwt.encode(payload, _private_key, algorithm="RS256", headers={"kid": _kid})
    return token, expires_in


def decode_token(token: str) -> dict:
    """Verify the signature/expiry locally; raises jwt.PyJWTError on failure."""
    return jwt.decode(token, _public_key, algorithms=["RS256"])


def jwks() -> dict:
    numbers = _public_key.public_numbers()
    return {
        "keys": [
            {
                "kty": "RSA",
                "use": "sig",
                "alg": "RS256",
                "kid": _kid,
                "n": _b64url_uint(numbers.n),
                "e": _b64url_uint(numbers.e),
            }
        ]
    }
