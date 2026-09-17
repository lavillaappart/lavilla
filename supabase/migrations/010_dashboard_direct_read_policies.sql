-- Politicas directas de lectura para el dashboard administrativo.
-- Ejecutar despues de 009_admin_dashboard_rls.sql.

DROP POLICY IF EXISTS "Dashboard direct read customers" ON public.customers;
CREATE POLICY "Dashboard direct read customers"
ON public.customers FOR SELECT TO authenticated
USING (public.is_dashboard_staff());

DROP POLICY IF EXISTS "Dashboard direct read requests" ON public.reservation_requests;
CREATE POLICY "Dashboard direct read requests"
ON public.reservation_requests FOR SELECT TO authenticated
USING (public.is_dashboard_staff());

DROP POLICY IF EXISTS "Dashboard direct read reservations" ON public.reservations;
CREATE POLICY "Dashboard direct read reservations"
ON public.reservations FOR SELECT TO authenticated
USING (public.is_dashboard_staff());

DROP POLICY IF EXISTS "Dashboard direct read payments" ON public.payments;
CREATE POLICY "Dashboard direct read payments"
ON public.payments FOR SELECT TO authenticated
USING (public.is_dashboard_staff());

DROP POLICY IF EXISTS "Dashboard direct read settings" ON public.settings;
CREATE POLICY "Dashboard direct read settings"
ON public.settings FOR SELECT TO authenticated
USING (public.is_dashboard_staff());
