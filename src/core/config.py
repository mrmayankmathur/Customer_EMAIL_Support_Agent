"""
Application configuration loaded from environment variables.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings — loaded from .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- LLM (GitHub Models / OpenAI-compatible) ---
    GITHUB_TOKEN: str = ""
    LLM_BASE_URL: str = "https://models.github.ai/inference"
    LLM_MODEL: str = "openai/gpt-4.1"
    EMBEDDING_MODEL: str = "openai/text-embedding-3-small"

    # --- Email / IMAP ---
    EMAIL_HOST: str = "imap.gmail.com"
    EMAIL_PORT: int = 993
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    EMAIL_USERNAME: str = ""
    EMAIL_PASSWORD: str = ""

    # --- App ---
    APP_ENV: str = "development"
    LOG_LEVEL: str = "DEBUG"

    @property
    def DEBUG(self) -> bool:
        return self.APP_ENV == "development"


settings = Settings()
