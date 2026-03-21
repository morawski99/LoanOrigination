"""Add aus_results table

Revision ID: 001_add_aus_results
Revises:
Create Date: 2026-03-21

"""
from alembic import op
import sqlalchemy as sa

revision = "001_add_aus_results"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enums first
    aus_system_enum = sa.Enum(
        "DU", "LPA",
        name="aus_system",
    )
    aus_finding_enum = sa.Enum(
        "Approve/Eligible",
        "Approve/Ineligible",
        "Refer",
        "Refer/Eligible",
        "Refer with Caution",
        "Out of Scope",
        "Accept",
        "Caution",
        "Ineligible",
        "Error",
        name="aus_finding",
    )

    op.create_table(
        "aus_results",
        sa.Column("id", sa.String(36), primary_key=True, index=True),
        sa.Column("loan_id", sa.String(36), sa.ForeignKey("loans.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("system", aus_system_enum, nullable=False),
        sa.Column("casefile_id", sa.String(100), nullable=False),
        sa.Column("submission_number", sa.Integer, nullable=False, default=1),
        sa.Column("finding", aus_finding_enum, nullable=False),
        sa.Column("max_ltv_percent", sa.Numeric(precision=6, scale=3), nullable=True),
        sa.Column("max_cltv_percent", sa.Numeric(precision=6, scale=3), nullable=True),
        sa.Column("reserves_months", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column("documentation_type", sa.String(100), nullable=True),
        sa.Column("doc_requirements", sa.JSON, nullable=True),
        sa.Column("recommendations", sa.JSON, nullable=True),
        sa.Column("findings_summary", sa.Text, nullable=True),
        sa.Column("submitted_by_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("run_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("raw_response", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("aus_results")
    op.execute("DROP TYPE IF EXISTS aus_finding")
    op.execute("DROP TYPE IF EXISTS aus_system")
