import enum
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Numeric, Boolean, Enum as SAEnum, ForeignKey
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class AssetType(str, enum.Enum):
    CHECKING_ACCOUNT = "CheckingAccount"
    SAVINGS_ACCOUNT = "SavingsAccount"
    MONEY_MARKET_FUND = "MoneyMarketFund"
    CERTIFICATE_OF_DEPOSIT = "CertificateOfDeposit"
    MUTUAL_FUND = "MutualFund"
    STOCK = "Stock"
    BOND = "Bond"
    RETIREMENT_FUND = "RetirementFund"
    BRIDGE_LOAN_NOT_DEPOSITED = "BridgeLoanNotDeposited"
    INDIVIDUAL_DEVELOPMENT_ACCOUNT = "IndividualDevelopmentAccount"
    LIFE_INSURANCE = "LifeInsurance"
    TRUST_ACCOUNT = "TrustAccount"
    GIFT_FUNDS = "GiftFunds"
    GIFT_OF_EQUITY = "GiftOfEquity"
    GRANT_FUNDS = "GrantFunds"
    NET_PROCEEDS_FROM_SALE = "NetProceedsFromSale"
    NON_VESTED_RESTRICTED_STOCK_UNITS = "NonVestedRestrictedStockUnits"
    OTHER_LIQUID_ASSETS = "OtherLiquidAssets"
    OTHER_NON_LIQUID_ASSETS = "OtherNonLiquidAssets"
    PENDING_NET_SALE_PROCEEDS = "PendingNetSaleProceeds"
    SALE_OTHER_ASSETS = "SaleOtherAssets"


class BorrowerAsset(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "borrower_assets"

    borrower_id: MappedColumn[UUID] = mapped_column(
        String(36),
        ForeignKey("borrowers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asset_type: MappedColumn[AssetType] = mapped_column(
        SAEnum(AssetType, name="asset_type", create_type=True),
        nullable=False,
    )
    financial_institution_name: MappedColumn[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    account_identifier: MappedColumn[Optional[str]] = mapped_column(
        String(50), nullable=True, comment="Last 4 digits only"
    )
    current_value_amount: MappedColumn[Decimal] = mapped_column(
        Numeric(precision=14, scale=2), nullable=False
    )
    gift_source_type: MappedColumn[Optional[str]] = mapped_column(String(100), nullable=True)
    is_deplete_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # Relationship back to borrower
    borrower: Mapped["Borrower"] = relationship(  # noqa: F821
        "Borrower",
        back_populates="assets",
    )

    def __repr__(self) -> str:
        return (
            f"<BorrowerAsset id={self.id} borrower_id={self.borrower_id} "
            f"type={self.asset_type} value={self.current_value_amount}>"
        )
