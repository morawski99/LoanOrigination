"""Add aus_results table

Revision ID: 004_add_aus_results
Revises: 003_add_conditions
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa

revision = "004_add_aus_results"
down_revision = "003_add_conditions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    du_recommendation_enum = sa.Enum(
        "Approve/Eligible",
        "Approve/Ineligible",
        "Refer",
        "Refer with Caution",
        "Out of Scope",
        name="du_recommendation",
    )
    lpa_recommendation_enum = sa.Enum(
        "Accept",
        "Caution",
        "Ineligible",
        name="lpa_recommendation",
    )

    op.create_table(
        "aus_results",
        sa.Column("id", sa.String(36), primary_key=True, index=True),
        sa.Column(
            "loan_id",
            sa.String(36),
            sa.ForeignKey("loans.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "submitted_by_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # DU
        sa.Column("du_recommendation", du_recommendation_enum, nullable=False),
        sa.Column("du_case_id", sa.String(50), nullable=False),
        sa.Column("du_rep_warranty_relief", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("du_doc_waiver", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("du_findings", sa.JSON, nullable=True),
        # LPA
        sa.Column("lpa_recommendation", lpa_recommendation_enum, nullable=False),
        sa.Column("lpa_key", sa.String(50), nullable=False),
        sa.Column("lpa_rep_warranty_relief", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("lpa_doc_class", sa.String(20), nullable=False, server_default="Standard"),
        sa.Column("lpa_findings", sa.JSON, nullable=True),
        # Snapshot + timestamp
        sa.Column("submission_data", sa.JSON, nullable=True),
        sa.Column(
            "run_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
            index=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("aus_results")
    op.execute("DROP TYPE IF EXISTS du_recommendation")
    op.execute("DROP TYPE IF EXISTS lpa_recommendation")
