"""Add status_changed_at to loans table

Revision ID: 002_add_status_changed_at
Revises: 001_add_aus_results
Create Date: 2026-03-21

"""
from alembic import op
import sqlalchemy as sa

revision = "002_add_status_changed_at"
down_revision = "001_add_aus_results"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "loans",
        sa.Column(
            "status_changed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    # Backfill: set status_changed_at = created_at for all existing loans
    op.execute(
        "UPDATE loans SET status_changed_at = created_at WHERE status_changed_at IS NULL"
    )


def downgrade() -> None:
    op.drop_column("loans", "status_changed_at")
