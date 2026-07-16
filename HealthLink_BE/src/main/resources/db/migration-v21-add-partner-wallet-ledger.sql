SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.PartnerWalletEntries', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PartnerWalletEntries (
        EntryId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PartnerWalletEntries PRIMARY KEY,
        partnerType VARCHAR(20) NOT NULL,
        partnerId VARCHAR(450) NOT NULL,
        entryType VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        commissionTransactionId INT NULL,
        settlementId INT NULL,
        appointmentId INT NULL,
        pharmacyOrderId INT NULL,
        paymentId INT NULL,
        IdempotencyKey VARCHAR(180) NOT NULL,
        description VARCHAR(500) NULL,
        effectiveAt DATETIME2 NOT NULL,
        createdAt DATETIME2 NOT NULL,
        updatedAt DATETIME2 NOT NULL
    );
END;

IF COL_LENGTH('dbo.CommissionTransactions', 'RefundedAt') IS NULL
    ALTER TABLE dbo.CommissionTransactions ADD RefundedAt DATETIME2 NULL;

IF COL_LENGTH('dbo.Settlements', 'payout_batch_id') IS NULL
    ALTER TABLE dbo.Settlements ADD payout_batch_id VARCHAR(255) NULL;

IF COL_LENGTH('dbo.Settlements', 'external_status') IS NULL
    ALTER TABLE dbo.Settlements ADD external_status VARCHAR(50) NULL;

IF COL_LENGTH('dbo.Settlements', 'last_reconciled_at') IS NULL
    ALTER TABLE dbo.Settlements ADD last_reconciled_at DATETIME2 NULL;

IF COL_LENGTH('dbo.Settlements', 'client_request_id') IS NULL
    ALTER TABLE dbo.Settlements ADD client_request_id VARCHAR(100) NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.Settlements')
      AND name = 'UX_Settlements_PayoutBatchId'
)
    CREATE UNIQUE INDEX UX_Settlements_PayoutBatchId
        ON dbo.Settlements (payout_batch_id)
        WHERE payout_batch_id IS NOT NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.Settlements')
      AND name = 'UX_Settlements_PartnerClientRequestId'
)
    CREATE UNIQUE INDEX UX_Settlements_PartnerClientRequestId
        ON dbo.Settlements (recipientType, recipientId, client_request_id)
        WHERE client_request_id IS NOT NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.PartnerWalletEntries')
      AND name = 'IX_PartnerWalletEntries_PartnerId_EffectiveAt'
)
    CREATE INDEX IX_PartnerWalletEntries_PartnerId_EffectiveAt
        ON dbo.PartnerWalletEntries (partnerId, effectiveAt DESC);

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.PartnerWalletEntries')
      AND name = 'IX_PartnerWalletEntries_SettlementId_EntryType'
)
    CREATE INDEX IX_PartnerWalletEntries_SettlementId_EntryType
        ON dbo.PartnerWalletEntries (settlementId, entryType);

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.PartnerWalletEntries')
      AND name = 'UK_WalletEntry_Idempotency'
)
    CREATE UNIQUE INDEX UK_WalletEntry_Idempotency
        ON dbo.PartnerWalletEntries (IdempotencyKey);

INSERT INTO dbo.PartnerWalletEntries (
    partnerType, partnerId, entryType, status, amount, commissionTransactionId,
    appointmentId, pharmacyOrderId, IdempotencyKey, description,
    effectiveAt, createdAt, updatedAt
)
SELECT
    ctx.recipientType,
    ctx.recipientId,
    'EARNING',
    CASE WHEN ctx.status = 'PENDING' THEN 'PENDING' ELSE 'VESTED' END,
    ctx.netAmount,
    ctx.TransactionId,
    ctx.AppointmentId,
    ctx.PharmacyOrderId,
    CONCAT('EARNING:CTX:', ctx.TransactionId),
    CONCAT('Backfilled earning from commission transaction ', ctx.transactionNumber),
    CASE WHEN ctx.status = 'VESTED' THEN COALESCE(ctx.VestedAt, ctx.CreatedAt) ELSE ctx.CreatedAt END,
    ctx.CreatedAt,
    ctx.CreatedAt
FROM dbo.CommissionTransactions ctx
WHERE ctx.status IN ('PENDING', 'VESTED')
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.PartnerWalletEntries entry
      WHERE entry.IdempotencyKey = CONCAT('EARNING:CTX:', ctx.TransactionId)
  );

INSERT INTO dbo.PartnerWalletEntries (
    partnerType, partnerId, entryType, status, amount, commissionTransactionId,
    appointmentId, pharmacyOrderId, IdempotencyKey, description,
    effectiveAt, createdAt, updatedAt
)
SELECT
    ctx.recipientType,
    ctx.recipientId,
    'REFUND',
    'REFUNDED',
    -ctx.netAmount,
    ctx.TransactionId,
    ctx.AppointmentId,
    ctx.PharmacyOrderId,
    CONCAT('REFUND:CTX:', ctx.TransactionId),
    CONCAT('Backfilled refund from commission transaction ', ctx.transactionNumber),
    COALESCE(ctx.RefundedAt, ctx.CreatedAt),
    ctx.CreatedAt,
    COALESCE(ctx.RefundedAt, ctx.CreatedAt)
FROM dbo.CommissionTransactions ctx
WHERE ctx.status = 'REFUNDED'
  AND ctx.VestedAt IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.PartnerWalletEntries entry
      WHERE entry.IdempotencyKey = CONCAT('REFUND:CTX:', ctx.TransactionId)
  );

INSERT INTO dbo.PartnerWalletEntries (
    partnerType, partnerId, entryType, status, amount, settlementId,
    IdempotencyKey, description, effectiveAt, createdAt, updatedAt
)
SELECT
    stl.recipientType,
    stl.recipientId,
    'WITHDRAWAL',
    CASE
        WHEN stl.status IN ('PENDING', 'PROCESSING') THEN 'PROCESSING'
        WHEN stl.status = 'COMPLETED' THEN 'COMPLETED'
        ELSE 'FAILED'
    END,
    -stl.netAmount,
    stl.SettlementId,
    CONCAT('WITHDRAWAL:STL:', stl.SettlementId),
    CONCAT('Backfilled withdrawal from settlement ', stl.settlementNumber),
    COALESCE(stl.completedAt, stl.processedAt, stl.CreatedAt),
    stl.CreatedAt,
    stl.CreatedAt
FROM dbo.Settlements stl
WHERE stl.status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.PartnerWalletEntries entry
      WHERE entry.IdempotencyKey = CONCAT('WITHDRAWAL:STL:', stl.SettlementId)
  );

COMMIT TRANSACTION;
