"""Add HMDA records and adverse action notices tables

Revision ID: 007_add_compliance_tables
Revises: 006_add_underwriting_decisions
Create Date: 2026-03-30

"""
from alembic import op
import sqlalchemy as sa

revision = "007_add_compliance_tables"
down_revision = "006_add_underwriting_decisions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── HMDA Records ─────────────────────────────────────────────────────
    hmda_action_enum = sa.Enum(
        "1", "2", "3", "4", "5", "6", "7", "8",
        name="hmda_action_taken",
    )
    hmda_denial_enum = sa.Enum(
        "1", "2", "3", "4", "5", "6", "7", "8", "9",
        name="hmda_denial_reason",
    )
    hmda_validation_enum = sa.Enum(
        "Pending", "Valid", "Errors", "Warnings",
        name="hmda_validation_status",
    )

    op.create_table(
        "hmda_records",
        sa.Column("id", sa.String(36), primary_key=True, index=True),
        sa.Column(
            "loan_id", sa.String(36),
            sa.ForeignKey("loans.id", ondelete="CASCADE"),
            nullable=False, index=True,
        ),
        sa.Column("activity_year", sa.Integer, nullable=False),
        sa.Column("lei", sa.String(20), nullable=True),
        sa.Column("uli", sa.String(45), nullable=True),
        sa.Column("action_taken", hmda_action_enum, nullable=True),
        sa.Column("action_taken_date", sa.Date, nullable=True),
        sa.Column("denial_reason_1", hmda_denial_enum, nullable=True),
        sa.Column("denial_reason_2", hmda_denial_enum, nullable=True),
        sa.Column("denial_reason_3", hmda_denial_enum, nullable=True),
        sa.Column("denial_reason_4", hmda_denial_enum, nullable=True),
        sa.Column("loan_purpose", sa.String(2), nullable=True),
        sa.Column("loan_type", sa.String(2), nullable=True),
        sa.Column("loan_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("interest_rate", sa.Numeric(6, 4), nullable=True),
        sa.Column("rate_spread", sa.Numeric(6, 4), nullable=True),
        sa.Column("hoepa_status", sa.String(2), nullable=True),
        sa.Column("lien_status", sa.String(2), nullable=True),
        sa.Column("loan_term_months", sa.Integer, nullable=True),
        sa.Column("property_type", sa.String(2), nullable=True),
        sa.Column("occupancy_type", sa.String(2), nullable=True),
        sa.Column("property_state", sa.String(2), nullable=True),
        sa.Column("property_county", sa.String(100), nullable=True),
        sa.Column("census_tract", sa.String(11), nullable=True),
        sa.Column("applicant_ethnicity", sa.String(5), nullable=True),
        sa.Column("applicant_race", sa.String(5), nullable=True),
        sa.Column("applicant_sex", sa.String(2), nullable=True),
        sa.Column("co_applicant_ethnicity", sa.String(5), nullable=True),
        sa.Column("co_applicant_race", sa.String(5), nullable=True),
        sa.Column("co_applicant_sex", sa.String(2), nullable=True),
        sa.Column("applicant_income", sa.Numeric(14, 2), nullable=True),
        sa.Column("dti_ratio", sa.Numeric(6, 2), nullable=True),
        sa.Column("combined_ltv", sa.Numeric(6, 2), nullable=True),
        sa.Column("validation_status", hmda_validation_enum, nullable=False, server_default="Pending"),
        sa.Column("validation_errors", sa.Text, nullable=True),
        sa.Column("application_date", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("loan_id", name="uq_hmda_records_loan_id"),
    )

    # ── Adverse Action Notices ───────────────────────────────────────────
    aa_type_enum = sa.Enum(
        "Denial", "CounterofferDeclined", "WithdrawalAfterCounteroffer", "IncompleteApplication",
        name="adverse_action_type",
    )
    aa_reason_enum = sa.Enum(
        "CreditApplicationIncomplete", "InsufficientCreditReferences",
        "UnableToVerifyCredit", "TemporaryOrIrregularEmployment",
        "UnableToVerifyEmployment", "UnableToVerifyIncome",
        "ExcessiveObligations", "InsufficientIncome",
        "InadequateCollateral", "CreditHistoryDelinquent",
        "InsufficientLengthEmployment", "InsufficientLengthResidence",
        "TooManyRecentInquiries", "Bankruptcy",
        "GarnishmentAttachment", "ForeclosureRepossession",
        "UnacceptableAppraisal", "MortgageInsuranceDenied", "Other",
        name="adverse_action_reason_code",
    )
    aa_status_enum = sa.Enum(
        "Draft", "PendingReview", "Sent", "Acknowledged",
        name="adverse_action_status",
    )

    op.create_table(
        "adverse_action_notices",
        sa.Column("id", sa.String(36), primary_key=True, index=True),
        sa.Column(
            "loan_id", sa.String(36),
            sa.ForeignKey("loans.id", ondelete="CASCADE"),
            nullable=False, index=True,
        ),
        sa.Column("action_type", aa_type_enum, nullable=False),
        sa.Column("status", aa_status_enum, nullable=False, server_default="Draft"),
        sa.Column("reason_code_1", aa_reason_enum, nullable=True),
        sa.Column("reason_code_2", aa_reason_enum, nullable=True),
        sa.Column("reason_code_3", aa_reason_enum, nullable=True),
        sa.Column("reason_code_4", aa_reason_enum, nullable=True),
        sa.Column("decision_date", sa.Date, nullable=False),
        sa.Column("notice_deadline", sa.Date, nullable=False),
        sa.Column("sent_date", sa.Date, nullable=True),
        sa.Column("delivery_method", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "created_by_id", sa.String(36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "sent_by_id", sa.String(36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("adverse_action_notices")
    op.drop_table("hmda_records")
    op.execute("DROP TYPE IF EXISTS adverse_action_status")
    op.execute("DROP TYPE IF EXISTS adverse_action_reason_code")
    op.execute("DROP TYPE IF EXISTS adverse_action_type")
    op.execute("DROP TYPE IF EXISTS hmda_validation_status")
    op.execute("DROP TYPE IF EXISTS hmda_denial_reason")
    op.execute("DROP TYPE IF EXISTS hmda_action_taken")
