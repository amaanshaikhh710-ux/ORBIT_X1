"""
Orbital Twin Secure Authentication & Production RBAC System
Defines the authoritative 4-role model, bcrypt password hashing, JWT tokens,
and reusable server-side authorization dependencies.
"""
import os
import time
import logging
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional, List
import bcrypt
import jwt
from fastapi import Header, Query, HTTPException, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.db.session import SessionLocal
from backend.db.models import User

logger = logging.getLogger("orbital_twin.auth")

JWT_SECRET = os.getenv("JWT_SECRET", "orbital-twin-auth-secret-key-sat-3u-orbit-x1")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


# ==========================================
# 1. Authoritative 4-Role Model
# ==========================================

class UserRole(str, Enum):
    MISSION_ADMINISTRATOR = "Mission Administrator"
    MISSION_OPERATOR = "Mission Operator"
    FLIGHT_DIRECTOR = "Flight Director"
    SIMULATION_ENGINEER = "Simulation Engineer"


VALID_ROLES: List[str] = [r.value for r in UserRole]


# ==========================================
# 2. Pydantic Request Models
# ==========================================

class LoginRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = None  # Ignored for auth; DB role is authoritative


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = UserRole.MISSION_OPERATOR.value


# ==========================================
# 3. Cryptography & Token Helpers
# ==========================================

def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt with salt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception as e:
        logger.warning("Password verification failed: %s", e)
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Encodes a signed JWT token containing user identity and authoritative role."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates a signed JWT token."""
    try:
        if token.startswith("Bearer "):
            token = token[7:]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None


def authenticate_user(db: Session, username: str, password: str, fallback_role: Optional[str] = None) -> Optional[User]:
    """
    Authenticates username and password against database records.
    Role is strictly retrieved from the database, never from frontend input.
    """
    user = db.query(User).filter_by(username=username).first()
    if not user:
        return None

    if verify_password(password, user.password_hash):
        return user

    return None


# ==========================================
# 4. Reusable RBAC FastAPI Dependencies
# ==========================================

def require_authenticated_user(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
) -> dict:
    """
    Validates JWT token from the Authorization header or token query parameter.
    Returns authoritative operator identity from the database.
    Raises HTTP 401 if unauthenticated.
    """
    raw_token = authorization or (f"Bearer {token}" if token else None)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(raw_token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = payload["sub"]

    # Verify user exists in database and fetch authoritative role
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(username=username).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "authenticated": True,
        }
    finally:
        db.close()


def require_role(role: UserRole):
    """
    Enforces that the authenticated user possesses the specified role.
    Mission Administrator is always granted full access.
    Raises HTTP 403 if forbidden.
    """
    def _checker(current_user: dict = Depends(require_authenticated_user)) -> dict:
        user_role = current_user.get("role")
        if user_role == UserRole.MISSION_ADMINISTRATOR.value or user_role == role.value:
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Action requires '{role.value}' role (current role: '{user_role}')",
        )
    return _checker


def require_any_role(*roles: UserRole):
    """
    Enforces that the authenticated user possesses one of the allowed roles.
    Mission Administrator is always granted full access.
    Raises HTTP 403 if forbidden.
    """
    allowed_roles = {r.value for r in roles}
    allowed_roles.add(UserRole.MISSION_ADMINISTRATOR.value)

    def _checker(current_user: dict = Depends(require_authenticated_user)) -> dict:
        user_role = current_user.get("role")
        if user_role in allowed_roles:
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Action requires one of {sorted(list(allowed_roles))} (current role: '{user_role}')",
        )
    return _checker


def require_admin_user(current_user: dict = Depends(require_authenticated_user)) -> dict:
    """
    Enforces strict Mission Administrator role only.
    Raises HTTP 403 for any other role.
    """
    user_role = current_user.get("role")
    if user_role == UserRole.MISSION_ADMINISTRATOR.value:
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Forbidden: Mission Administrator privileges required (current role: '{user_role}')",
    )


def require_admin_role():
    """Returns dependency checker for Mission Administrator role."""
    return require_admin_user


def get_current_user_from_header(authorization: Optional[str] = Header(None)) -> dict:
    """
    Permits optional extraction for legacy or inspection endpoints.
    Falls back to unauthenticated operator dict.
    """
    if authorization:
        payload = decode_access_token(authorization)
        if payload and "sub" in payload:
            db = SessionLocal()
            try:
                user = db.query(User).filter_by(username=payload["sub"]).first()
                if user:
                    return {
                        "username": user.username,
                        "role": user.role,
                        "authenticated": True,
                    }
            finally:
                db.close()

            return {
                "username": payload["sub"],
                "role": payload.get("role", UserRole.MISSION_OPERATOR.value),
                "authenticated": True,
            }

    return {
        "username": "guest_operator",
        "role": UserRole.MISSION_OPERATOR.value,
        "authenticated": False,
    }
