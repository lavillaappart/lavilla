-- ================================================
-- Project: WebAnas
-- Database: Supabase PostgreSQL
-- Phase: 2 - Security baseline
-- ================================================

-- Helper function: check whether an authenticated user has a specific permission.
CREATE OR REPLACE FUNCTION public.has_permission(permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    JOIN public.roles r ON r.id = rp.role_id
    JOIN public.profiles p ON p.role_id = r.id
    JOIN public.permissions perm ON perm.id = rp.permission_id
    WHERE p.id = auth.uid()
      AND perm.key = permission_key
      AND rp.granted = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND r.slug::TEXT = role_name
  );
$$;

-- Profiles
CREATE POLICY "Users can read their own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Roles and permissions: restricted to owner/admin
CREATE POLICY "Admins can read roles"
ON public.roles FOR SELECT
USING (public.has_role('owner') OR public.has_role('admin'));

CREATE POLICY "Admins can manage roles"
ON public.roles FOR ALL
USING (public.has_role('owner'))
WITH CHECK (public.has_role('owner'));

CREATE POLICY "Admins can read permissions"
ON public.permissions FOR SELECT
USING (public.has_role('owner') OR public.has_role('admin'));

CREATE POLICY "Owner can manage permissions"
ON public.permissions FOR ALL
USING (public.has_role('owner'))
WITH CHECK (public.has_role('owner'));

CREATE POLICY "Owner can manage role assignments"
ON public.role_permissions FOR ALL
USING (public.has_role('owner'))
WITH CHECK (public.has_role('owner'));

-- Apartments: public read, admin write
CREATE POLICY "Public read apartments"
ON public.apartments FOR SELECT
USING (status = 'active');

CREATE POLICY "Admins manage apartments"
ON public.apartments FOR ALL
USING (public.has_permission('apartments.write'))
WITH CHECK (public.has_permission('apartments.write'));

CREATE POLICY "Public read apartment translations"
ON public.apartment_translations FOR SELECT
USING (true);

CREATE POLICY "Admins manage apartment translations"
ON public.apartment_translations FOR ALL
USING (public.has_permission('apartments.write'))
WITH CHECK (public.has_permission('apartments.write'));

CREATE POLICY "Public read amenities"
ON public.amenities FOR SELECT
USING (true);

CREATE POLICY "Admins manage amenities"
ON public.amenities FOR ALL
USING (public.has_permission('apartments.write'))
WITH CHECK (public.has_permission('apartments.write'));

CREATE POLICY "Public read amenity translations"
ON public.amenity_translations FOR SELECT
USING (true);

CREATE POLICY "Admins manage amenity translations"
ON public.amenity_translations FOR ALL
USING (public.has_permission('apartments.write'))
WITH CHECK (public.has_permission('apartments.write'));

-- Customers and requests
CREATE POLICY "Authenticated staff can read customers"
ON public.customers FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert customers"
ON public.customers FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Authenticated users can update their own customer"
ON public.customers FOR UPDATE
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Admins manage reservation requests"
ON public.reservation_requests FOR ALL
USING (public.has_permission('reservations.write'))
WITH CHECK (public.has_permission('reservations.write'));

CREATE POLICY "Public insert reservation requests"
ON public.reservation_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins manage reservations"
ON public.reservations FOR ALL
USING (public.has_permission('reservations.write'))
WITH CHECK (public.has_permission('reservations.write'));

CREATE POLICY "Customers can read their own reservations"
ON public.reservations FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  OR public.has_permission('reservations.read')
);

-- Payments
CREATE POLICY "Admins manage payments"
ON public.payments FOR ALL
USING (public.has_permission('payments.verify'))
WITH CHECK (public.has_permission('payments.verify'));

-- Settings and bank details
CREATE POLICY "Admins read settings"
ON public.settings FOR SELECT
USING (public.has_permission('settings.read'));

CREATE POLICY "Owner manages settings"
ON public.settings FOR ALL
USING (public.has_role('owner'))
WITH CHECK (public.has_role('owner'));

CREATE POLICY "Admins read bank details"
ON public.bank_details FOR SELECT
USING (public.has_permission('settings.read'));

CREATE POLICY "Owner manages bank details"
ON public.bank_details FOR ALL
USING (public.has_role('owner'))
WITH CHECK (public.has_role('owner'));

-- Audit logs
CREATE POLICY "Admins read audit logs"
ON public.audit_logs FOR SELECT
USING (public.has_permission('audit.read'));

CREATE POLICY "System inserts audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- Content translations
CREATE POLICY "Public read content translations"
ON public.content_translations FOR SELECT
USING (true);

CREATE POLICY "Admins manage content translations"
ON public.content_translations FOR ALL
USING (public.has_permission('settings.write'))
WITH CHECK (public.has_permission('settings.write'));

-- External integration tables
CREATE POLICY "Admins read external sync data"
ON public.external_channels FOR SELECT
USING (public.has_permission('settings.read'));

CREATE POLICY "Admins manage external sync data"
ON public.external_channels FOR ALL
USING (public.has_role('owner') OR public.has_role('admin'))
WITH CHECK (public.has_role('owner') OR public.has_role('admin'));

CREATE POLICY "Admins read external property mappings"
ON public.external_property_mappings FOR SELECT
USING (public.has_permission('settings.read') OR public.has_permission('apartments.write'));

CREATE POLICY "Admins manage external property mappings"
ON public.external_property_mappings FOR ALL
USING (public.has_permission('apartments.write'))
WITH CHECK (public.has_permission('apartments.write'));

CREATE POLICY "Admins read external reservations"
ON public.external_reservations FOR SELECT
USING (public.has_permission('reservations.read') OR public.has_permission('reservations.write'));

CREATE POLICY "Admins manage external reservations"
ON public.external_reservations FOR ALL
USING (public.has_permission('reservations.write'))
WITH CHECK (public.has_permission('reservations.write'));
