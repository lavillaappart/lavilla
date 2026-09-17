# WebAnas / La Villa - progreso1

## Objetivo del proyecto
Plataforma real de alquiler de apartamentos con web publica, panel cliente y panel administrativo. Stack: Next.js + TypeScript, Supabase PostgreSQL/Auth/Storage/RLS y Vercel. Idioma principal actual: frances (`fr`). Moneda: dirham marroqui (`MAD`). No implementar Booking.com todavia; solo dejar arquitectura futura.

## Repositorio y despliegue
- GitHub: `https://github.com/lavillaappart/lavilla`
- Rama: `master`
- Vercel: `https://lavilla-roan.vercel.app`
- Remote Git configurado como `origin`.
- Identidad Git corregida: `lavillaappart <lavilla@rifgamestudio.com>`.
- Ultimo commit conocido: `a4646c7` (`Redesign public home and apartment detail`).
- El proyecto local compila con `npx tsc --noEmit` y `npm run build`.
- No hacer force push salvo necesidad explicita.

## Seguridad de secretos
- `.env.local` existe localmente y esta incluido en `.gitignore`.
- Contiene variables reales de Supabase y Vercel, pero no deben copiarse a este archivo de progreso ni subirse a GitHub.
- La `SUPABASE_SERVICE_ROLE_KEY` fue compartida anteriormente en el chat; debe regenerarse en Supabase y actualizarse en Vercel.

## Variables de entorno
Variables necesarias en local/Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` solo servidor
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_DEFAULT_LOCALE=fr`

## Base de datos Supabase
Migraciones creadas en `supabase/migrations`:

### 001_initial_schema.sql
Crea enums, tablas, indices, triggers y activa RLS. Entidades principales:
- roles, permissions, role_permissions, profiles
- apartments, apartment_translations, apartment_images
- amenities, amenity_translations, apartment_amenities
- customers
- reservation_requests, reservations, payments
- blocked_dates, pricing_rules
- settings, bank_details, audit_logs, content_translations
- external_channels, external_property_mappings, external_reservations

Incluye prevencion de solapamiento en reservas confirmadas mediante trigger PostgreSQL.

### 002_rls_and_policies.sql
Politicas RLS iniciales y helpers `has_permission()` / `has_role()`. Tiene una politica antigua de reservas que leia `auth.users`; esa politica queda corregida por la migracion 012.

### 003_client_registration.sql
Anade a `profiles`: `address`, `country`, `whatsapp_phone`. Crea trigger `handle_new_user()` para crear perfiles. Evita que un usuario cambie su propio rol/estado.

### 004_apartment_management.sql
Crea bucket publico `apartment-images`, politicas iniciales de Storage y politicas de `apartment_images`.

### 005_fix_apartment_image_insert.sql
Refuerza INSERT/UPDATE/DELETE/SELECT de `apartment_images` y confirma el bucket.

### 006_admin_apartment_images_rls.sql
Politicas directas de imagenes para owner/admin.

### 007_direct_admin_image_policies.sql
Crea `is_apartment_admin()` como `SECURITY DEFINER` y refuerza politicas de tabla y Storage para imagenes.

### 008_currency_mad.sql
Convierte apartamentos EUR a MAD y establece default MAD.

### 009_admin_dashboard_rls.sql
Crea `is_dashboard_staff()` y politicas de lectura/actualizacion para dashboard administrativo.

### 010_dashboard_direct_read_policies.sql
Refuerza lectura directa de customers, requests, reservations, payments y settings para dashboard.

### 011_hide_demo_apartment.sql
Desactiva el demo `apartamento-centro` sin borrarlo.

### 012_fix_reservation_auth_policy.sql
Elimina la politica que leia directamente `auth.users` y usa `auth.jwt() ->> 'email'`.

### 013_remove_demo_apartment.sql
Elimina solo el demo `apartamento-centro`, sus traducciones, imagenes, solicitudes, reservas y pagos asociados, y `ana@example.com` si no tiene relaciones. Ejecutar solo si se confirma que son datos de prueba.

IMPORTANTE: el usuario ha ido ejecutando SQL manualmente en Supabase. Antes de diagnosticar, confirmar que las migraciones necesarias realmente se ejecutaron y revisar errores exactos del SQL Editor.

## Seed
`supabase/seed.sql` contiene datos iniciales de roles/permisos, un apartamento demo, traducciones, imagen y datos bancarios de ejemplo. No es un dump de la base real. No ejecutar el demo si el cliente ya tiene datos reales.

## Aplicacion Next.js
Archivos/claves:
- `app/page.tsx`: home publica. Actualmente consulta todos los apartamentos `status=active` desde Supabase, muestra imagen de portada real y precio MAD.
- `app/appartements/page.tsx`: listado publico desde Supabase con portada real.
- `app/appartements/[slug]/page.tsx`: detalle publico rediseñado con galeria, foto principal, datos, precio MAD y CTA `Demander ce séjour` hacia `/registro`.
- `app/admin/page.tsx`: dashboard admin con contadores y herramientas.
- `app/admin/[section]/page.tsx`: rutas dinamicas para solicitudes, reservas, llegadas, salidas, clientes, pagos, calendario y ajustes.
- `app/admin/apartamentos/page.tsx`: catalogo y creacion de apartamentos.
- `app/admin/apartamentos/[id]/page.tsx`: edicion.
- `components/apartment-form.tsx`: alta con una foto de perfil obligatoria y hasta 9 de galeria; 10 total. Sube a Storage y luego inserta `apartment_images`. Tras exito redirige a `/admin/apartamentos`.
- `components/edit-apartment-form.tsx`: edita datos, reemplaza portada y anade galeria hasta 10 total.
- `components/delete-apartment-button.tsx`: intenta borrar; si hay FK por reservas, desactiva (`inactive`) y conserva historial.
- `components/request-actions.tsx`: acciones para solicitudes: contactar, pedir pago, rechazar, cancelar.
- `components/session-controls.tsx`: login/registro/cierre de sesion visibles.
- `middleware.ts`: protege `/admin` y `/compte`.
- `app/registro/page.tsx`: registro manual obligatorio.
- `app/login/page.tsx`: login manual.
- `app/compte/page.tsx`: perfil cliente obligatorio.
- `app/reservations/page.tsx`: reservas del cliente.

## Separacion de roles
- Cliente: `/registro`, `/login`, `/compte`, `/reservations`.
- Admin: `/admin` y herramientas operativas.
- Admin no debe completar datos de cliente.
- La navegacion de portada diferencia admin y cliente por rol.
- Admin solo entra si role es owner/admin/coadmin/staff; creacion/edicion de apartamentos limitada a owner/admin.

## Flujo de solicitudes previsto
Cliente registrado + perfil completo -> solicita fechas/apartamento -> `reservation_requests.status=pending` -> admin contacta -> `contacted` -> solicita transferencia -> `awaiting_payment` -> justificante -> `payment_received` -> confirma reserva -> `reservations` confirmada. No hay pagos online.

## Estado actual importante
- La interfaz admin tiene dashboard y menus.
- El dashboard lee datos reales, pero necesita que 009 y 010 esten ejecutadas.
- La vista de reservas tuvo error `permission denied for table users`; 012 corrige la politica antigua de `auth.users`.
- El modulo de apartamentos permite crear/editar/borrar, fotos reales y MAD.
- La portada y detalle publicos ya usan imagenes reales de Supabase.
- La home ya no usa apartamentos hardcodeados; muestra todos los apartamentos activos.
- El demo debe eliminarse ejecutando 013 solo si se confirma que es demo.

## Pendientes prioritarios
1. Confirmar/ejecutar migraciones 009, 010, 012 y 013 en Supabase segun corresponda.
2. Probar dashboard completo despues de SQL: reservas, llegadas, salidas, calendario, clientes, pagos, ajustes.
3. Terminar control completo de solicitudes: aceptar debe crear reserva confirmada tras pago verificado; actualmente hay acciones basicas de estado.
4. Crear pagina/formulario de nueva solicitud de reserva y validacion de perfil cliente completo.
5. Implementar disponibilidad real, bloqueos, estancia minima/maxima y evitar dobles reservas end-to-end.
6. Completar calendario visual y CRUD de blocked_dates.
7. Completar gestion de pagos manuales y justificantes.
8. Completar WhatsApp y emails traducidos.
9. Completar paginas legales, contacto, sobre nosotros, SEO, sitemap, robots y multidioma de URLs.
10. Revisar RLS de todas las tablas y tests.

## Regla para el siguiente agente
No inventar datos demo ni API de Booking. Antes de cambiar RLS, identificar la tabla/operacion exacta y mostrar el error real. Mantener migraciones SQL reproducibles y pedir al usuario ejecutar cada nueva migracion en Supabase SQL Editor. Validar siempre con `npx tsc --noEmit` y `npm run build` antes de publicar.
