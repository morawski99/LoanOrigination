"""Add closing tables

Revision ID: 005_add_closing_tables
Revises: 004_add_aus_results
Create Date: 2026-03-27

"""
from alembic import op
import sqlalchemy as sa

revision = "005_add_closing_tables"
down_revision = "004_add_aus_results"
branch_labels = None
depends_on = None


def upgrade() -> None:
    cd_status_enum = sa.Enum("Draft", "Issued", "Revised", "Superseded", name="cd_status")
    checklist_category_enum = sa.Enum("Title", "Insurance", "Compliance", "Funding", "Other", name="checklist_category")
    checklist_item_status_enum = sa.Enum("Pending", "Complete", "NA", name="checklist_item_status")
    funding_status_type_enum = sa.Enum("NotReady", "Scheduled", "Funded", "Suspended", name="funding_status_type")

    # ── Closing Disclosures ───────────────────────────────────────────────────
    op.create_table(
        "closing_disclosures",
        sa.Column("id", sa.String(36), primary_key=True, index=True),
        sa.Column("loan_id", sa.String(36), sa.ForeignKey("loans.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("version_number", sa.Integer, nullable=False, server_default="1"),
        sa.Column("status", cd_status_enum, nullable=False, server_default="Draft"),
        # Key dates
        sa.Column("issued_date", sa.Date, nullable=True),
        sa.Column("delivery_date", sa.Date, nullable=True),
        sa.Column("closing_date", sa.Date, nullable=True),
        sa.Column("disbursement_date", sa.Date, nullable=True),
        sa.Column("cd_delivery_deadline", sa.Date, nullable=True),
        # Links
        sa.Column("linked_le_id", sa.String(36), sa.ForeignKey("loan_estimates.id", ondelete="SET NULL"), nullable=True),
        sa.Column("revision_reason", sa.String(500), nullable=True),
        sa.Column("supersedes_cd_id", sa.String(36), nullable=True),
        # Loan terms
        sa.Column("loan_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("loan_term_months", sa.Integer, nullable=False, server_default="360"),
        sa.Column("note_rate_percent", sa.Numeric(6, 4), nullable=True),
        sa.Column("apr_percent", sa.Numeric(6, 4), nullable=True),
        # Payments
        sa.Column("monthly_principal_interest", sa.Numeric(12, 2), nullable=True),
        sa.Column("monthly_mortgage_insurance", sa.Numeric(12, 2), nullable=True),
        sa.Column("monthly_escrow_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("total_monthly_payment", sa.Numeric(12, 2), nullable=True),
        # Cost totals
        sa.Column("total_loan_costs", sa.Numeric(14, 2), nullable=True),
        sa.Column("total_other_costs", sa.Numeric(14, 2), nullable=True),
        sa.Column("lender_credits", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("total_closing_costs", sa.Numeric(14, 2), nullable=True),
        # Cash to close
        sa.Column("purchase_price", sa.Numeric(14, 2), nullable=True),
        sa.Column("down_payment", sa.Numeric(14, 2), nullable=True),
        sa.Column("deposit", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("seller_credits", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("cash_to_close", sa.Numeric(14, 2), nullable=True),
        # Issued by
        sa.Column("issued_by_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # ── Closing Disclosure Fees ───────────────────────────────────────────────
    op.create_table(
        "closing_disclosure_fees",
        sa.Column("id", sa.String(36), primary_key=True, index=True),
        sa.Column("closing_disclosure_id", sa.String(36), sa.ForeignKey("closing_disclosures.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("respa_section", sa.Enum("A", "B", "C", "E", "F", "G", "H", name="respa_section", create_type=False), nullable=False),
        sa.Column("fee_name", sa.String(200), nullable=False),
        sa.Column("fee_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("tolerance_category", sa.Enum("Zero", "TenPercent", "Unlimited", name="tolerance_category", create_type=False), nullable=False),
        sa.Column("paid_by", sa.Enum("Borrower", "Seller", "Lender", "Other", name="paid_by", create_type=False), nullable=False, server_default="Borrower"),
        sa.Column("paid_to", sa.String(200), nullable=True),
        sa.Column("is_finance_charge", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        # UUIDMixin has created_at from Base but no timestamps needed for fee line items
    )

    # ── Closing Checklist ─────────────────────────────────────────────────────
    op.create_table(
        "closing_checklist",
        sa.Column("id", sa.String(36), primary_key=True, index=True),
        sa.Column("loan_id", sa.String(36), sa.ForeignKey("loans.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("category", checklist_category_enum, nullable=False),
        sa.Column("status", checklist_item_status_enum, nullable=False, server_default="Pending"),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("due_date", sa.String(10), nullable=True),
        sa.Column("completed_date", sa.String(10), nullable=True),
        sa.Column("assigned_to", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # ── Wire Instructions ─────────────────────────────────────────────────────
    op.create_table(
        "wire_instructions",
        sa.Column("id", sa.String(36), primary_key=True, index=True),
        sa.Column("loan_id", sa.String(36), sa.ForeignKey("loans.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("beneficiary_name", sa.String(200), nullable=False),
        sa.Column("beneficiary_address", sa.String(500), nullable=True),
        sa.Column("bank_name", sa.String(200), nullable=False),
        sa.Column("aba_routing_number", sa.String(9), nullable=False),
        sa.Column("account_number", sa.String(34), nullable=False),
        sa.Column("reference_number", sa.String(100), nullable=True),
        sa.Column("special_instructions", sa.Text, nullable=True),
        sa.Column("verified", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("verified_by_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # ── Funding Status ────────────────────────────────────────────────────────
    op.create_table(
        "funding_status",
        sa.Column("id", sa.String(36), primary_key=True, index=True),
        sa.Column("loan_id", sa.String(36), sa.ForeignKey("loans.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("status", funding_status_type_enum, nullable=False, server_default="NotReady"),
        sa.Column("scheduled_date", sa.Date, nullable=True),
        sa.Column("funded_date", sa.Date, nullable=True),
        sa.Column("funded_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("confirmation_number", sa.String(100), nullable=True),
        sa.Column("funding_source", sa.String(200), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("funding_status")
    op.drop_table("wire_instructions")
    op.drop_table("closing_checklist")
    op.drop_table("closing_disclosure_fees")
    op.drop_table("closing_disclosures")
    op.execute("DROP TYPE IF EXISTS cd_status")
    op.execute("DROP TYPE IF EXISTS checklist_category")
    op.execute("DROP TYPE IF EXISTS checklist_item_status")
    op.execute("DROP TYPE IF EXISTS funding_status_type")
