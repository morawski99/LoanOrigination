"""Add conditions table

Revision ID: 003_add_conditions
Revises: 002_add_status_changed_at
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa

revision = "003_add_conditions"
down_revision = "002_add_status_changed_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    condition_type_enum = sa.Enum(
        "PTA", "PTD", "PTF",
        name="condition_type",
    )
    condition_status_enum = sa.Enum(
        "Open", "Cleared", "Waived",
        name="condition_status",
    )

    op.create_table(
        "conditions",
        sa.Column("id", sa.String(36), primary_key=True, index=True),
        sa.Column("loan_id", sa.String(36), sa.ForeignKey("loans.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("condition_type", condition_type_enum, nullable=False, index=True),
        sa.Column("status", condition_status_enum, nullable=False, server_default="Open"),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("due_date", sa.String(10), nullable=True),
        sa.Column("assigned_to", sa.String(100), nullable=True),
        sa.Column("created_by_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("conditions")
    op.execute("DROP TYPE IF EXISTS condition_status")
    op.execute("DROP TYPE IF EXISTS condition_type")
