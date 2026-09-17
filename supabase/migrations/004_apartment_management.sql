-- WebAnas - gestion de apartamentos y fotografias
-- Ejecutar despues de 003_client_registration.sql.

INSERT INTO storage.buckets (id, name, public)
VALUES ('apartment-images', 'apartment-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view apartment images" ON storage.objects;
CREATE POLICY "Public can view apartment images"
ON storage.objects FOR SELECT
USING (bucket_id = 'apartment-images');

DROP POLICY IF EXISTS "Admins can upload apartment images" ON storage.objects;
CREATE POLICY "Admins can upload apartment images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'apartment-images'
  AND public.has_permission('apartments.write')
);

DROP POLICY IF EXISTS "Admins can update apartment images" ON storage.objects;
CREATE POLICY "Admins can update apartment images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'apartment-images'
  AND public.has_permission('apartments.write')
)
WITH CHECK (
  bucket_id = 'apartment-images'
  AND public.has_permission('apartments.write')
);

DROP POLICY IF EXISTS "Admins can delete apartment images" ON storage.objects;
CREATE POLICY "Admins can delete apartment images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'apartment-images'
  AND public.has_permission('apartments.write')
);

DROP POLICY IF EXISTS "Public read apartment image records" ON public.apartment_images;
CREATE POLICY "Public read apartment image records"
ON public.apartment_images FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins manage apartment image records" ON public.apartment_images;
CREATE POLICY "Admins manage apartment image records"
ON public.apartment_images FOR ALL
USING (public.has_permission('apartments.write'))
WITH CHECK (public.has_permission('apartments.write'));
