-- Ocultar el apartamento de demostracion sin borrar el historial relacionado.
-- Ejecutar despues de 010_dashboard_direct_read_policies.sql.

UPDATE public.apartments
SET status = 'inactive',
    is_featured = false,
    updated_at = now()
WHERE slug = 'apartamento-centro';
