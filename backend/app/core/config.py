from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_name: str = "Get Rich or Try Again"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/getrich"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Clerk Auth
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""

    # Alpaca
    alpaca_api_key: str = ""
    alpaca_secret_key: str = ""
    alpaca_base_url: str = "https://paper-api.alpaca.markets"  # Paper trading by default

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
