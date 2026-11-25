"""
Verdicts AI - Application Configuration Module.
"""

from functools import lru_cache
from typing import Any, Literal
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Verdicts AI"
    APP_ENV: Literal["development", "testing", "production"] = "development"
    DEBUG: bool = True
    HOST: str = "127.0.0.1"
    PORT: int = 8002

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v: Any) -> bool:
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            clean_val = v.strip().lower()
            if clean_val in ("true", "1", "t", "yes", "y", "dev", "development"):
                return True
            if clean_val in ("false", "0", "f", "no", "n", "release", "prod", "production"):
                return False
        return bool(v)

    # NVIDIA NIM / LLM Configuration
    NVIDIA_API_KEY: str = "nvapi-placeholder"
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_MODEL_NAME: str = "nvidia/nemotron-3.5-bolt-e4b"
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 4096
    LLM_TIMEOUT: int = 60

    # Research & Search API Configuration
    TAVILY_API_KEY: str = ""
    TAVILY_SEARCH_DEPTH: str = "advanced"

    # Permitted Image Provider Keys (Wikimedia Commons is default free provider)
    UNSPLASH_ACCESS_KEY: str = ""
    PEXELS_API_KEY: str = ""

    # PostgreSQL Database Configuration
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/verdicts_ai"
    DB_POOL_SIZE: int = 15
    DB_MAX_OVERFLOW: int = 30
    DB_ECHO: bool = False

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def sanitize_database_url(cls, v: Any) -> Any:
        """
        Normalizes Render/Heroku 'postgres://' schemes to 'postgresql://' for SQLAlchemy 2.0
        and auto-encodes special characters like '#' in database passwords.
        """
        if isinstance(v, str) and "://" in v:
            if v.startswith("postgres://"):
                v = "postgresql://" + v[len("postgres://"):]
            scheme, rest = v.split("://", 1)
            if "@" in rest:
                userinfo, hostinfo = rest.rsplit("@", 1)
                if ":" in userinfo:
                    user, pwd = userinfo.split(":", 1)
                    if "#" in pwd:
                        pwd = pwd.replace("#", "%23")
                    return f"{scheme}://{user}:{pwd}@{hostinfo}"
        return v

    # Production Limits & Quality Gates
    DAILY_ARTICLE_LIMIT: int = 200
    DEFAULT_QUALITY_THRESHOLD: float = 8.0

    # Admin Portal Authentication
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "verdictsadmin123"
    JWT_SECRET_KEY: str = "verdicts-ai-super-secret-judicial-jwt-key-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
