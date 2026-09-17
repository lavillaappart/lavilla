-- Correccion definitiva de RLS para gestion de imagenes.
-- Ejecutar despues de 005_fix_apartment_image_insert.sql.

ALTER TABLE public.apartment_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage apartment image records" ON public.apartment_images;
DROP POLICY IF EXISTS "Admins insert apartment image records" ON public.apartment_images;
DROP POLICY IF EXISTS "Admins update apartment image records" ON public.apartment_images;
DROP POLICY IF EXISTS "Admins delete apartment image records" ON public.apartment_images;

CREATE POLICY "Admins insert apartment image records"
ON public.apartment_images FOR INSERT TO authenticated
WITH CHECK (public.has_role('owner') OR public.has_role('admin'));

CREATE POLICY "Admins update apartment image records"
ON public.apartment_images FOR UPDATE TO authenticated
USING (public.has_role('owner') OR public.has_role('admin'))
WITH CHECK (public.has_role('owner') OR public.has_role('admin'));

CREATE POLICY "Admins delete apartment image records"
ON public.apartment_images FOR DELETE TO authenticated
USING (public.has_role('owner') OR public.has_role('admin'));

DROP POLICY IF EXISTS "Public read apartment image records" ON public.apartment_images;
CREATE POLICY "Public read apartment image records"
ON public.apartment_images FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins upload apartment image objects" ON storage.objects;
CREATE POLICY "Admins upload apartment image objects"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'apartment-images' AND (public.has_role('owner') OR public.has_role('admin')));

DROP POLICY IF EXISTS "Admins update apartment image objects" ON storage.objects;
CREATE POLICY "Admins update apartment image objects"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'apartment-images' AND (public.has_role('owner') OR public.has_role('admin')))
WITH CHECK (bucket_id = 'apartment-images' AND (public.has_role('owner') OR public.has_role('admin')));

DROP POLICY IF EXISTS "Admins delete apartment image objects" ON storage.objects;
CREATE POLICY "Admins delete apartment image objects"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'apartment-images' AND (public.has_role('owner') OR public.has_role('admin')));