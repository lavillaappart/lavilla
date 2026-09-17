-- Eliminar unicamente los datos demo creados para las pruebas iniciales.
-- No ejecutar si apartamento-centro o ana@example.com contienen datos reales.

BEGIN;

DELETE FROM public.payments
WHERE reservation_id IN (
  SELECT reservation.id
  FROM public.reservations reservation
  JOIN public.apartments apartment ON apartment.id = reservation.apartment_id
  WHERE apartment.slug = 'apartamento-centro'
)
OR request_id IN (
  SELECT request.id
  FROM public.reservation_requests request
  JOIN public.apartments apartment ON apartment.id = request.apartment_id
  WHERE apartment.slug = 'apartamento-centro'
);

DELETE FROM public.reservations
WHERE apartment_id IN (
  SELECT id FROM public.apartments WHERE slug = 'apartamento-centro'
);

DELETE FROM public.reservation_requests
WHERE apartment_id IN (
  SELECT id FROM public.apartments WHERE slug = 'apartamento-centro'
);

DELETE FROM public.apartment_images
WHERE apartment_id IN (
  SELECT id FROM public.apartments WHERE slug = 'apartamento-centro'
);

DELETE FROM public.apartment_translations
WHERE apartment_id IN (
  SELECT id FROM public.apartments WHERE slug = 'apartamento-centro'
);

DELETE FROM public.apartments
WHERE slug = 'apartamento-centro';

DELETE FROM public.customers
WHERE email = 'ana@example.com'
  AND NOT EXISTS (SELECT 1 FROM public.reservations WHERE customer_id = customers.id)
  AND NOT EXISTS (SELECT 1 FROM public.reservation_requests WHERE customer_id = customers.id);

COMMIT;
