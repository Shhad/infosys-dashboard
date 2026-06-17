import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import User


def get_by_email(db: Session, email: str) -> User | None:
    return db.execute(select(User).where(User.email == email)).scalar_one_or_none()


def get_by_id(db: Session, user_id) -> User | None:
    try:
        uid = uuid.UUID(str(user_id))
    except (ValueError, TypeError):
        return None
    return db.get(User, uid)


def create(db: Session, email: str, password_hash: str, role: str = "USER") -> User:
    user = User(email=email, password_hash=password_hash, role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_all(db: Session) -> list[User]:
    return list(db.execute(select(User).order_by(User.created_at)).scalars().all())


def set_role(db: Session, user: User, role: str) -> User:
    user.role = role
    db.commit()
    db.refresh(user)
    return user
