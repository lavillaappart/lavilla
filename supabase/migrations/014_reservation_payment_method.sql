ALTER TABLE public.reservation_requests
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'bank_transfer';

ALTER TABLE public.reservation_requests
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(12,2) DEFAULT NULL;

-- Update existing rows to keep compatibility with current payment model.
UPDATE public.reservation_requests
SET payment_method = 'bank_transfer'
WHERE payment_method IS NULL OR payment_method = '';

COMMENT ON COLUMN public.reservation_requests.payment_method IS 'Preferred payment mode for the reservation request: bank_transfer, partial_now, on_arrival';
COMMENT ON COLUMN public.reservation_requests.payment_amount IS 'Optional amount to pay now when the request uses a partial payment plan';
