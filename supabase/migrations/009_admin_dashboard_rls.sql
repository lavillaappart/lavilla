-- RLS operativo para el dashboard administrativo.
-- Ejecutar despues de 008_currency_mad.sql.

CREATE OR REPLACE FUNCTION public.is_dashboard_staff()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles profile
    JOIN public.roles role ON role.id = profile.role_id
    WHERE profile.id = auth.uid()
      AND role.slug IN ('owner', 'admin', 'coadmin', 'staff')
      AND profile.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_dashboard_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_dashboard_staff() TO authenticated;

DROP POLICY IF EXISTS "Dashboard staff read customers" ON public.customers;
CREATE POLICY "Dashboard staff read customers"
ON public.customers FOR SELECT TO authenticated
USING (public.is_dashboard_staff());

DROP POLICY IF EXISTS "Dashboard staff read requests" ON public.reservation_requests;
CREATE POLICY "Dashboard staff read requests"
ON public.reservation_requests FOR SELECT TO authenticated
USING (public.is_dashboard_staff());

DROP POLICY IF EXISTS "Dashboard staff update requests" ON public.reservation_requests;
CREATE POLICY "Dashboard staff update requests"
ON public.reservation_requests FOR UPDATE TO authenticated
USING (public.is_dashboard_staff())
WITH CHECK (public.is_dashboard_staff());

DROP POLICY IF EXISTS "Dashboard staff read reservations" ON public.reservations;
CREATE POLICY "Dashboard staff read reservations"
ON public.reservations FOR SELECT TO authenticated
USING (public.is_dashboard_staff());

DROP POLICY IF EXISTS "Dashboard staff update reservations" ON public.reservations;
CREATE POLICY "Dashboard staff update reservations"
ON public.reservations FOR UPDATE TO authenticated
USING (public.is_dashboard_staff())
WITH CHECK (public.is_dashboard_staff());

DROP POLICY IF EXISTS "Dashboard staff read payments" ON public.payments;
CREATE POLICY "Dashboard staff read payments"
ON public.payments FOR SELECT TO authenticated
USING (public.is_dashboard_staff());

DROP POLICY IF EXISTS "Dashboard staff update payments" ON public.payments;
CREATE POLICY "Dashboard staff update payments"
ON public.payments FOR UPDATE TO authenticated
USING (public.is_dashboard_staff())
WITH CHECK (public.is_dashboard_staff());

DROP POLICY IF EXISTS "Dashboard staff read blocked dates" ON public.blocked_dates;
CREATE POLICY "Dashboard staff read blocked dates"
ON public.blocked_dates FOR SELECT TO authenticated
USING (public.is_dashboard_staff());

DROP POLICY IF EXISTS "Dashboard staff manage blocked dates" ON public.blocked_dates;
CREATE POLICY "Dashboard staff manage blocked dates"
ON public.blocked_dates FOR ALL TO authenticated
USING (public.is_dashboard_staff())
WITH CHECK (public.is_dashboard_staff());

DROP POLICY IF EXISTS "Dashboard staff read settings" ON public.settings;
CREATE POLICY "Dashboard staff read settings"
ON public.settings FOR SELECT TO authenticated
USING (public.is_dashboard_staff());
