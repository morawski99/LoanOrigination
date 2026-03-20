from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/loanorigination"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = "change-me-in-production-use-256-bit-random-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"

    # Environment
    ENVIRONMENT: str = "development"

    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: str = "loan-documents"
    AWS_REGION: str = "us-east-1"

    # Fannie Mae
    FANNIE_MAE_API_KEY: Optional[str] = None
    FANNIE_MAE_API_URL: str = "https://api.fanniemae.com"

    # Freddie Mac
    FREDDIE_MAC_API_KEY: Optional[str] = None
    FREDDIE_MAC_API_URL: str = "https://api.freddiemac.com"

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        allowed = {"development", "staging", "production"}
        if v not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of {allowed}")
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
