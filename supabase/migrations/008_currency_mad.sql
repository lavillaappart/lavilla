-- WebAnas - moneda de alquiler en dirham marroqui
-- Ejecutar despues de las migraciones anteriores.

UPDATE public.apartments
SET currency = 'MAD'
WHERE currency IS NULL OR currency = 'EUR';

ALTER TABLE public.apartments
  ALTER COLUMN currency SET DEFAULT 'MAD';
