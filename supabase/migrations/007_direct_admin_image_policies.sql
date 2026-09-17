-- WebAnas - politicas directas para fotos de apartamentos
-- Ejecutar despues de 006_admin_apartment_images_rls.sql.

ALTER TABLE public.apartment_images ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_apartment_admin()
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
      AND role.slug IN ('owner', 'admin')
      AND profile.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_apartment_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_apartment_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins insert apartment image records" ON public.apartment_images;
DROP POLICY IF EXISTS "Admins update apartment image records" ON public.apartment_images;
DROP POLICY IF EXISTS "Admins delete apartment image records" ON public.apartment_images;

CREATE POLICY "Admins insert apartment image records"
ON public.apartment_images FOR INSERT TO authenticated
WITH CHECK (
  public.is_apartment_admin()
);

CREATE POLICY "Admins update apartment image records"
ON public.apartment_images FOR UPDATE TO authenticated
USING (
  public.is_apartment_admin()
)
WITH CHECK (
  public.is_apartment_admin()
);

CREATE POLICY "Admins delete apartment image records"
ON public.apartment_images FOR DELETE TO authenticated
USING (
  public.is_apartment_admin()
);

DROP POLICY IF EXISTS "Admins upload apartment image objects" ON storage.objects;
CREATE POLICY "Admins upload apartment image objects"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'apartment-images' AND public.is_apartment_admin());

DROP POLICY IF EXISTS "Admins update apartment image objects" ON storage.objects;
CREATE POLICY "Admins update apartment image objects"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'apartment-images' AND public.is_apartment_admin())
WITH CHECK (bucket_id = 'apartment-images' AND public.is_apartment_admin());

DROP POLICY IF EXISTS "Admins delete apartment image objects" ON storage.objects;
CREATE POLICY "Admins delete apartment image objects"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'apartment-images' AND public.is_apartment_admin());
