-- Eliminar la politica que intentaba leer auth.users desde RLS.
-- Ejecutar despues de 011_hide_demo_apartment.sql.

DROP POLICY IF EXISTS "Customers can read their own reservations" ON public.reservations;

CREATE POLICY "Customers can read their own reservations"
ON public.reservations FOR SELECT TO authenticated
USING (
  customer_id IN (
    SELECT id
    FROM public.customers
    WHERE email = (auth.jwt() ->> 'email')
  )
  OR public.is_dashboard_staff()
);
