"""Add underwriting_decisions table

Revision ID: 006_add_underwriting_decisions
Revises: 005_add_closing_tables
Create Date: 2026-03-28

"""
from alembic import op
import sqlalchemy as sa

revision = "006_add_underwriting_decisions"
down_revision = "005_add_closing_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    decision_type_enum = sa.Enum(
        "Approved", "ConditionalApproval", "Suspended", "Declined",
        name="underwriting_decision_type",
    )

    op.create_table(
        "underwriting_decisions",
        sa.Column("id", sa.String(36), primary_key=True, index=True),
        sa.Column(
            "loan_id",
            sa.String(36),
            sa.ForeignKey("loans.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("decision_type", decision_type_enum, nullable=False),
        sa.Column(
            "decided_by_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("underwriting_decisions")
    op.execute("DROP TYPE IF EXISTS underwriting_decision_type")
