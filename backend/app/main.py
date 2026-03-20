from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Lifespan context manager for startup and shutdown events.
    On startup: verify database connectivity.
    On shutdown: dispose of the engine connection pool.
    """
    # Startup
    try:
        async with engine.begin() as conn:
            # Verify we can connect — do not run migrations here
            await conn.run_sync(lambda _: None)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(
            f"Database connection check failed on startup: {e}. "
            "Ensure PostgreSQL is running and DATABASE_URL is correct."
        )

    yield

    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="LoanOrigination API",
    description=(
        "Enterprise Home Loan Origination System — RESTful API for managing "
        "loan files, borrowers, documents, AUS submissions, and compliance reporting."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(api_router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Simple health check endpoint.
    Returns the current environment and status.
    """
    return {"status": "ok", "environment": settings.ENVIRONMENT}
