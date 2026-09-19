"""Application configuration - all values from environment, nothing hard-coded for tenants."""

from functools import lru_cache
from pathlib import Path
from typing import List
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load backend/.env regardless of process cwd
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILE = _BACKEND_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "DineFlow"
    app_env: str = "development"
    debug: bool = True
    api_prefix: str = "/api/v1"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 1440
    refresh_token_expire_days: int = 30
    algorithm: str = "HS256"

    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = "Baton@1230"
    db_name: str = "pos_platform"
    db_pool_size: int = 50
    db_max_overflow: int = 100
    db_pool_recycle: int = 1800

    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    super_admin_email: str = "superadmin@yopmail.com"
    super_admin_username: str = "superadmin"
    super_admin_password: str = "DineFlow@1290"
    base_currency: str = "AED"
    super_admin_name: str = "Super Admin"

    @property
    def database_url(self) -> str:
        user = quote_plus(self.db_user)
        password = quote_plus(self.db_password)
        return (
            f"mysql+pymysql://{user}:{password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
            f"?charset=utf8mb4"
        )

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
