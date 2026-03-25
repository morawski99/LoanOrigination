"""Add ssn_last4, date_of_birth, and acknowledgment fields to borrowers

Revision ID: 002_add_borrower_fields
Revises: 001_add_aus_results
Create Date: 2026-03-21

"""
from alembic import op
import sqlalchemy as sa

revision = "002_add_borrower_fields"
down_revision = "001_add_aus_results"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("borrowers", sa.Column("ssn_last4", sa.String(4), nullable=True))
    op.add_column("borrowers", sa.Column("date_of_birth", sa.Date(), nullable=True))
    op.add_column("borrowers", sa.Column("agreed_app", sa.Boolean(), nullable=True))
    op.add_column("borrowers", sa.Column("agreed_credit_pull", sa.Boolean(), nullable=True))
    op.add_column("borrowers", sa.Column("agreed_ecoa", sa.Boolean(), nullable=True))
    op.add_column("borrowers", sa.Column("agreed_electronic", sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column("borrowers", "ssn_last4")
    op.drop_column("borrowers", "date_of_birth")
    op.drop_column("borrowers", "agreed_app")
    op.drop_column("borrowers", "agreed_credit_pull")
    op.drop_column("borrowers", "agreed_ecoa")
    op.drop_column("borrowers", "agreed_electronic")
