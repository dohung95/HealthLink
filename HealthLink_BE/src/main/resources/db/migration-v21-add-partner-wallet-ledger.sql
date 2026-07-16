SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.partner_wallet_entries', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.partner_wallet_entries (
        entry_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PartnerWalletEntries PRIMARY KEY,
        partner_type VARCHAR(20) NOT NULL,
        partner_id VARCHAR(450) NOT NULL,
        entry_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        commission_transaction_id INT NULL,
        settlement_id INT NULL,
        appointment_id INT NULL,
        pharmacy_order_id INT NULL,
        payment_id INT NULL,
        idempotency_key VARCHAR(180) NOT NULL,
        description VARCHAR(500) NULL,
        effective_at DATETIME2 NOT NULL,
        created_at DATETIME2 NOT NULL,
        updated_at DATETIME2 NOT NULL
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.partner_wallet_entries')
      AND name = 'IX_PartnerWalletEntries_PartnerId_EffectiveAt'
)
    CREATE INDEX IX_PartnerWalletEntries_PartnerId_EffectiveAt
        ON dbo.partner_wallet_entries (partner_id, effective_at DESC);

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.partner_wallet_entries')
      AND name = 'IX_PartnerWalletEntries_SettlementId_EntryType'
)
    CREATE INDEX IX_PartnerWalletEntries_SettlementId_EntryType
        ON dbo.partner_wallet_entries (settlement_id, entry_type);

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.partner_wallet_entries')
      AND name = 'UK_WalletEntry_Idempotency'
)
    CREATE UNIQUE INDEX UK_WalletEntry_Idempotency
        ON dbo.partner_wallet_entries (idempotency_key);

INSERT INTO dbo.partner_wallet_entries (
    partner_type, partner_id, entry_type, status, amount, commission_transaction_id,
    appointment_id, pharmacy_order_id, idempotency_key, description,
    effective_at, created_at, updated_at
)
SELECT
    ctx.recipient_type,
    ctx.recipient_id,
    'EARNING',
    CASE WHEN ctx.status = 'PENDING' THEN 'PENDING' ELSE 'VESTED' END,
    ctx.net_amount,
    ctx.transaction_id,
    ctx.appointment_id,
    ctx.pharmacy_order_id,
    CONCAT('EARNING:CTX:', ctx.transaction_id),
    CONCAT('Backfilled earning from commission transaction ', ctx.transaction_number),
    CASE WHEN ctx.status = 'VESTED' THEN COALESCE(ctx.vested_at, ctx.created_at) ELSE ctx.created_at END,
    ctx.created_at,
    ctx.created_at
FROM dbo.commission_transactions ctx
WHERE ctx.status IN ('PENDING', 'VESTED')
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.partner_wallet_entries entry
      WHERE entry.idempotency_key = CONCAT('EARNING:CTX:', ctx.transaction_id)
  );

INSERT INTO dbo.partner_wallet_entries (
    partner_type, partner_id, entry_type, status, amount, commission_transaction_id,
    appointment_id, pharmacy_order_id, idempotency_key, description,
    effective_at, created_at, updated_at
)
SELECT
    ctx.recipient_type,
    ctx.recipient_id,
    'REFUND',
    'REFUNDED',
    -ctx.net_amount,
    ctx.transaction_id,
    ctx.appointment_id,
    ctx.pharmacy_order_id,
    CONCAT('REFUND:CTX:', ctx.transaction_id),
    CONCAT('Backfilled refund from commission transaction ', ctx.transaction_number),
    ctx.created_at,
    ctx.created_at,
    ctx.created_at
FROM dbo.commission_transactions ctx
WHERE ctx.status = 'REFUNDED'
  AND ctx.vested_at IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.partner_wallet_entries entry
      WHERE entry.idempotency_key = CONCAT('REFUND:CTX:', ctx.transaction_id)
  );

INSERT INTO dbo.partner_wallet_entries (
    partner_type, partner_id, entry_type, status, amount, settlement_id,
    idempotency_key, description, effective_at, created_at, updated_at
)
SELECT
    stl.recipient_type,
    stl.recipient_id,
    'WITHDRAWAL',
    CASE
        WHEN stl.status IN ('PENDING', 'PROCESSING') THEN 'PROCESSING'
        WHEN stl.status = 'COMPLETED' THEN 'COMPLETED'
        ELSE 'FAILED'
    END,
    -stl.net_amount,
    stl.settlement_id,
    CONCAT('WITHDRAWAL:STL:', stl.settlement_id),
    CONCAT('Backfilled withdrawal from settlement ', stl.settlement_number),
    COALESCE(stl.completed_at, stl.processed_at, stl.created_at),
    stl.created_at,
    stl.created_at
FROM dbo.settlements stl
WHERE stl.status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.partner_wallet_entries entry
      WHERE entry.idempotency_key = CONCAT('WITHDRAWAL:STL:', stl.settlement_id)
  );

COMMIT TRANSACTION;
