import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import models, repository, security  # noqa: F401  (models registers the table)
from .config import settings
from .db import Base, SessionLocal, engine
from .errors import (
    AppError,
    app_error_handler,
    http_exception_handler,
    integrity_handler,
    validation_handler,
)
from .routers import admin as admin_router
from .routers import auth as auth_router


def _wait_for_db(retries: int = 30, delay: float = 1.0) -> None:
    for attempt in range(retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except OperationalError:
            if attempt == retries - 1:
                raise
            time.sleep(delay)


def _seed_admin() -> None:
    """Idempotent bootstrap admin (SPEC §4.1): insert only if missing."""
    db = SessionLocal()
    try:
        if repository.get_by_email(db, settings.bootstrap_admin_email) is None:
            repository.create(
                db,
                settings.bootstrap_admin_email,
                security.hash_password(settings.bootstrap_admin_password),
                "ADMIN",
            )
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    security.load_or_generate_keys()
    _wait_for_db()
    Base.metadata.create_all(bind=engine)
    _seed_admin()
    yield


app = FastAPI(title="auth-service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(IntegrityError, integrity_handler)

app.include_router(auth_router.router)
app.include_router(admin_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/.well-known/jwks.json")
def jwks():
    return security.jwks()
