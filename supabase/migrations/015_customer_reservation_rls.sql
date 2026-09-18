DROP POLICY IF EXISTS "Public insert reservation requests" ON public.reservation_requests;
DROP POLICY IF EXISTS "Customers can insert their own reservation requests" ON public.reservation_requests;
DROP POLICY IF EXISTS "Customers can read their own reservation requests" ON public.reservation_requests;
DROP POLICY IF EXISTS "Admins manage reservation requests" ON public.reservation_requests;

CREATE OR REPLACE FUNCTION public.current_user_customer_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.customers c
  JOIN public.profiles p ON p.email = c.email
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE POLICY "Customers can insert their own reservation requests"
ON public.reservation_requests FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND customer_id = public.current_user_customer_id()
);

CREATE POLICY "Customers can read their own reservation requests"
ON public.reservation_requests FOR SELECT
USING (
  customer_id = public.current_user_customer_id()
  OR public.has_permission('reservations.read')
  OR public.has_permission('reservations.write')
);

CREATE POLICY "Admins manage reservation requests"
ON public.reservation_requests FOR ALL
USING (public.has_permission('reservations.write'))
WITH CHECK (public.has_permission('reservations.write'));
