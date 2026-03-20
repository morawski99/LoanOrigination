"""
Alembic environment configuration for async SQLAlchemy.

This env.py is configured for async migrations using asyncpg as the database driver.
It imports all models from app.models to enable autogenerate support.
"""
import asyncio
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# Ensure the backend package root is on sys.path so we can import app.*
backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

# Import all models to register them with the metadata for autogenerate
from app.models.base import Base  # noqa: E402
from app.models.user import User  # noqa: E402, F401
from app.models.loan import Loan  # noqa: E402, F401
from app.models.borrower import Borrower  # noqa: E402, F401
from app.models.document import Document  # noqa: E402, F401
from app.models.audit_log import AuditLog  # noqa: E402, F401

# Alembic Config object — provides access to values in alembic.ini
config = context.config

# Configure Python logging from the alembic.ini file
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use the DeclarativeBase metadata for autogenerate
target_metadata = Base.metadata

# Override sqlalchemy.url from the environment variable if set
# This allows docker-compose and CI to inject the connection string
database_url = os.getenv("DATABASE_URL")
if database_url:
    # asyncpg requires the +asyncpg driver specifier
    if "postgresql://" in database_url and "+asyncpg" not in database_url:
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    config.set_main_option("sqlalchemy.url", database_url)


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    Generates SQL script without connecting to the database.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in async mode using asyncpg."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (connected to the database)."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
