-- Apply to the intended ncafe database/schema before deploying the cancellation-reason API.
-- Nullable by design: earlier canceled orders have no recorded reason.
-- No default/backfill; never invent a customer's cancellation reason.
BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason varchar(200);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'orders'::regclass AND conname = 'ck_orders_cancel_reason'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT ck_orders_cancel_reason
            CHECK (cancel_reason IS NULL OR
                (status = 'canceled' AND char_length(btrim(cancel_reason)) > 0));
    END IF;
END $$;

COMMIT;
