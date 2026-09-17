-- WebAnas - corregir insercion de imagenes de apartamentos
-- Ejecutar despues de 004_apartment_management.sql.

ALTER TABLE public.apartment_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins insert apartment image records" ON public.apartment_images;
CREATE POLICY "Admins insert apartment image records"
ON public.apartment_images
FOR INSERT
TO authenticated
WITH CHECK (public.has_permission('apartments.write'));

DROP POLICY IF EXISTS "Admins update apartment image records" ON public.apartment_images;
CREATE POLICY "Admins update apartment image records"
ON public.apartment_images
FOR UPDATE
TO authenticated
USING (public.has_permission('apartments.write'))
WITH CHECK (public.has_permission('apartments.write'));

DROP POLICY IF EXISTS "Admins delete apartment image records" ON public.apartment_images;
CREATE POLICY "Admins delete apartment image records"
ON public.apartment_images
FOR DELETE
TO authenticated
USING (public.has_permission('apartments.write'));

DROP POLICY IF EXISTS "Public read apartment image records" ON public.apartment_images;
CREATE POLICY "Public read apartment image records"
ON public.apartment_images
FOR SELECT
TO anon, authenticated
USING (true);

-- Confirma que el bucket existe incluso si 004 se ejecuto parcialmente.
INSERT INTO storage.buckets (id, name, public)
VALUES ('apartment-images', 'apartment-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
