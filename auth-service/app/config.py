from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration sourced from the environment (SPEC §7.1, NFR-5)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    auth_db_url: str = "postgresql://auth:auth@auth-db:5432/authdb"
    jwt_private_key_path: str = "/keys/private.pem"
    jwt_public_key_path: str = "/keys/public.pem"
    jwt_expires_in: int = 3600
    bootstrap_admin_email: str = "admin@example.com"
    bootstrap_admin_password: str = "change-me"
    cors_origins: str = "http://localhost:3000"

    @property
    def sqlalchemy_url(self) -> str:
        """Normalize to the psycopg v3 driver that SQLAlchemy expects."""
        url = self.auth_db_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
