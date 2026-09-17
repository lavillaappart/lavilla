-- ================================================
-- Project: WebAnas
-- Database: Supabase PostgreSQL
-- Phase: 1 - Initial schema
-- ================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE locale AS ENUM ('es', 'fr', 'en');
CREATE TYPE role_slug AS ENUM ('owner', 'admin', 'coadmin', 'staff');
CREATE TYPE apartment_status AS ENUM ('active', 'inactive', 'draft', 'archived');
CREATE TYPE reservation_request_status AS ENUM (
  'pending',
  'contacted',
  'awaiting_payment',
  'payment_received',
  'confirmed',
  'rejected',
  'cancelled',
  'expired'
);
CREATE TYPE reservation_status AS ENUM ('confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE payment_status AS ENUM ('pending', 'proof_received', 'verified', 'rejected', 'refunded');
CREATE TYPE source_type AS ENUM ('website', 'booking', 'channel_manager', 'manual');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug role_slug NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  language locale NOT NULL DEFAULT 'es',
  role_id UUID REFERENCES public.roles(id),
  status user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.apartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  status apartment_status NOT NULL DEFAULT 'draft',
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  capacity INT NOT NULL CHECK (capacity > 0),
  bedrooms INT NOT NULL DEFAULT 0 CHECK (bedrooms >= 0),
  beds INT NOT NULL DEFAULT 0 CHECK (beds >= 0),
  bathrooms INT NOT NULL DEFAULT 0 CHECK (bathrooms >= 0),
  surface_m2 NUMERIC(8,2) NOT NULL DEFAULT 0,
  min_stay_nights INT NOT NULL DEFAULT 2 CHECK (min_stay_nights > 0),
  max_stay_nights INT,
  base_price NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  check_in_time TEXT DEFAULT '15:00',
  check_out_time TEXT DEFAULT '11:00',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.apartment_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  locale locale NOT NULL,
  name TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  location_text TEXT,
  seo_title TEXT,
  seo_description TEXT,
  meta_keywords TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (apartment_id, locale)
);

CREATE TABLE IF NOT EXISTS public.apartment_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  alt_text TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.amenity_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  locale locale NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  UNIQUE (amenity_id, locale)
);

CREATE TABLE IF NOT EXISTS public.apartment_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  UNIQUE (apartment_id, amenity_id)
);

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  country TEXT,
  preferred_language locale DEFAULT 'es',
  source source_type NOT NULL DEFAULT 'website',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests_count INT NOT NULL CHECK (guests_count > 0),
  status reservation_request_status NOT NULL DEFAULT 'pending',
  special_requests TEXT,
  privacy_accepted BOOLEAN NOT NULL DEFAULT false,
  source source_type NOT NULL DEFAULT 'website',
  admin_assigned_to UUID REFERENCES public.profiles(id),
  contact_notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);

CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID UNIQUE REFERENCES public.reservation_requests(id) ON DELETE SET NULL,
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests_count INT NOT NULL CHECK (guests_count > 0),
  nightly_price NUMERIC(12,2) NOT NULL CHECK (nightly_price >= 0),
  total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  status reservation_status NOT NULL DEFAULT 'confirmed',
  source source_type NOT NULL DEFAULT 'website',
  admin_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.reservation_requests(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  status payment_status NOT NULL DEFAULT 'pending',
  proof_url TEXT,
  proof_uploaded_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  valid_from DATE,
  valid_to DATE,
  min_nights INT,
  max_nights INT,
  price_override NUMERIC(12,2),
  discount_percent NUMERIC(5,2),
  applies_to TEXT DEFAULT 'all',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (price_override IS NULL OR price_override >= 0),
  CHECK (discount_percent IS NULL OR discount_percent BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  value_type TEXT NOT NULL DEFAULT 'string',
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  iban TEXT NOT NULL,
  swift_bic TEXT,
  payment_reference TEXT,
  instructions TEXT NOT NULL,
  locale locale NOT NULL DEFAULT 'es',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace TEXT NOT NULL DEFAULT 'general',
  key TEXT NOT NULL,
  locale locale NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (namespace, key, locale)
);

CREATE TABLE IF NOT EXISTS public.external_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.external_property_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.external_channels(id) ON DELETE CASCADE,
  external_property_id TEXT NOT NULL,
  external_property_name TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (apartment_id, channel_id)
);

CREATE TABLE IF NOT EXISTS public.external_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.external_channels(id) ON DELETE CASCADE,
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
  external_reservation_id TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  source_payload JSONB,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ,
  UNIQUE (channel_id, external_reservation_id)
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.check_reservation_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    IF EXISTS (
      SELECT 1
      FROM public.reservations r
      WHERE r.apartment_id = NEW.apartment_id
        AND r.status = 'confirmed'
        AND r.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND r.check_in < NEW.check_out
        AND NEW.check_in < r.check_out
    ) THEN
      RAISE EXCEPTION 'Reservation overlap detected for the same apartment.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_apartments_slug ON public.apartments(slug);
CREATE INDEX IF NOT EXISTS idx_apartments_city ON public.apartments(city);
CREATE INDEX IF NOT EXISTS idx_apartment_translations_locale ON public.apartment_translations(locale);
CREATE INDEX IF NOT EXISTS idx_reservation_requests_status ON public.reservation_requests(status);
CREATE INDEX IF NOT EXISTS idx_reservation_requests_dates ON public.reservation_requests(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_apartment_dates ON public.reservations(apartment_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_apartment ON public.blocked_dates(apartment_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_external_property_mappings_channel ON public.external_property_mappings(channel_id);
CREATE INDEX IF NOT EXISTS idx_external_reservations_channel ON public.external_reservations(channel_id);

CREATE TRIGGER trg_set_updated_at_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at_apartments
BEFORE UPDATE ON public.apartments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at_reservation_requests
BEFORE UPDATE ON public.reservation_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at_reservations
BEFORE UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at_payments
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at_blocked_dates
BEFORE UPDATE ON public.blocked_dates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at_pricing_rules
BEFORE UPDATE ON public.pricing_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at_bank_details
BEFORE UPDATE ON public.bank_details
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_check_reservation_overlap
BEFORE INSERT OR UPDATE OF apartment_id, check_in, check_out, status
ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.check_reservation_overlap();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartment_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartment_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenity_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartment_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_property_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_reservations ENABLE ROW LEVEL SECURITY;
