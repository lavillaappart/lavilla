-- ================================================
-- Seed inicial para WebAnas
-- ================================================

INSERT INTO public.roles (name, slug, description, is_system)
VALUES
  ('Owner', 'owner', 'Acceso completo al sistema', true),
  ('Admin', 'admin', 'Admin operativo principal', true),
  ('Co-Admin', 'coadmin', 'Operación de reservas y clientes', true),
  ('Staff', 'staff', 'Consultas limitadas', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.permissions (key, description, category)
VALUES
  ('apartments.read', 'Leer apartamentos', 'apartments'),
  ('apartments.write', 'Crear y editar apartamentos', 'apartments'),
  ('reservations.read', 'Leer reservas', 'reservations'),
  ('reservations.write', 'Gestionar reservas y solicitudes', 'reservations'),
  ('payments.verify', 'Verificar pagos', 'payments'),
  ('settings.read', 'Leer configuración', 'settings'),
  ('settings.write', 'Editar configuración', 'settings'),
  ('audit.read', 'Leer auditoría', 'audit')
ON CONFLICT (key) DO NOTHING;

WITH r AS (
  SELECT id FROM public.roles WHERE slug = 'owner'
),
p AS (
  SELECT id FROM public.permissions
)
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM r, p
ON CONFLICT (role_id, permission_id) DO NOTHING;

WITH r AS (
  SELECT id FROM public.roles WHERE slug = 'admin'
),
p AS (
  SELECT id FROM public.permissions
  WHERE key IN (
    'apartments.read',
    'apartments.write',
    'reservations.read',
    'reservations.write',
    'payments.verify',
    'settings.read',
    'settings.write',
    'audit.read'
  )
)
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM r, p
ON CONFLICT (role_id, permission_id) DO NOTHING;

WITH r AS (
  SELECT id FROM public.roles WHERE slug = 'coadmin'
),
p AS (
  SELECT id FROM public.permissions
  WHERE key IN (
    'apartments.read',
    'reservations.read',
    'reservations.write',
    'settings.read'
  )
)
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM r, p
ON CONFLICT (role_id, permission_id) DO NOTHING;

WITH r AS (
  SELECT id FROM public.roles WHERE slug = 'staff'
),
p AS (
  SELECT id FROM public.permissions
  WHERE key IN (
    'apartments.read',
    'reservations.read'
  )
)
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM r, p
ON CONFLICT (role_id, permission_id) DO NOTHING;

WITH apt AS (
  INSERT INTO public.apartments (
    slug,
    status,
    city,
    address,
    capacity,
    bedrooms,
    beds,
    bathrooms,
    surface_m2,
    min_stay_nights,
    max_stay_nights,
    base_price,
    currency,
    check_in_time,
    check_out_time,
    is_featured
  )
  VALUES (
    'apartamento-centro',
    'active',
    'Valencia',
    'Calle Mayor 12, Valencia',
    4,
    2,
    3,
    2,
    80.00,
    2,
    14,
    120.00,
    'EUR',
    '15:00',
    '11:00',
    true
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id
)
INSERT INTO public.apartment_translations (
  apartment_id,
  locale,
  name,
  short_description,
  description,
  location_text,
  seo_title,
  seo_description
)
SELECT
  id,
  'es',
  'Apartamento Centro Valencia',
  'Apartamento moderno en el centro de Valencia.',
  'Apartamento amplio con dos dormitorios, cocina equipada, terraza y acceso a transporte público.',
  'Centro de Valencia',
  'Apartamento Centro Valencia',
  'Apartamento moderno para alquiler corto en Valencia'
FROM apt
ON CONFLICT (apartment_id, locale) DO NOTHING;

WITH apt AS (
  SELECT id
  FROM public.apartments
  WHERE slug = 'apartamento-centro'
  LIMIT 1
)
INSERT INTO public.apartment_translations (
  apartment_id,
  locale,
  name,
  short_description,
  description,
  location_text,
  seo_title,
  seo_description
)
SELECT
  id,
  'en',
  'Central Valencia Apartment',
  'Modern apartment in the center of Valencia.',
  'Spacious apartment with two bedrooms, fully equipped kitchen, terrace and excellent transport access.',
  'Central Valencia',
  'Central Valencia Apartment',
  'Modern apartment for short-term rental in Valencia'
FROM apt
ON CONFLICT (apartment_id, locale) DO NOTHING;

WITH apt AS (
  SELECT id
  FROM public.apartments
  WHERE slug = 'apartamento-centro'
  LIMIT 1
)
INSERT INTO public.apartment_images (
  apartment_id,
  storage_path,
  is_primary,
  sort_order,
  alt_text,
  caption
)
SELECT
  id,
  'apartments/apartamento-centro/1.jpg',
  true,
  1,
  'Apartamento centro Valencia',
  'Vista principal del apartamento'
FROM apt
ON CONFLICT DO NOTHING;

INSERT INTO public.bank_details (
  account_holder_name,
  bank_name,
  iban,
  swift_bic,
  payment_reference,
  instructions,
  locale,
  is_active
)
VALUES (
  'WebAnas SL',
  'Banco de España',
  'ES9121000418450200051332',
  'BSABESBB',
  'WEBANAS-001',
  'Realiza la transferencia a la cuenta indicada. Indica en el concepto la referencia WEBANAS-001.',
  'es',
  true
)
ON CONFLICT DO NOTHING;

INSERT INTO public.content_translations (namespace, key, locale, value)
VALUES
  ('general', 'site_name', 'es', 'WebAnas'),
  ('general', 'site_name', 'en', 'WebAnas'),
  ('general', 'site_name', 'fr', 'WebAnas'),
  ('general', 'hero_title', 'es', 'Busca tu apartamento ideal'),
  ('general', 'hero_title', 'en', 'Find your ideal apartment'),
  ('general', 'hero_title', 'fr', 'Trouvez votre appartement idéal')
ON CONFLICT (namespace, key, locale) DO NOTHING;
