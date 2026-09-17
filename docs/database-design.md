# Diseño de base de datos para WebAnas

## 1. Objetivo

La base de datos de Supabase debe soportar:

- ventas y solicitudes web públicas
- control de disponibilidad
- reservas confirmadas con validación fuerte
- pagos manuales por transferencia
- roles administrativos y permisos
- multidioma por traducción
- preparación para futuras integraciones externas, sin implementar Booking aún

## 2. Principios clave

- La solicitud de reserva y la reserva confirmada son modelos distintos.
- Los estados de solicitud, reserva y pago no se mezclan.
- La disponibilidad se valida en la base de datos, no solo en el frontend.
- Los permisos se gestionan con roles + permisos y RLS.
- Los textos traducidos se mantienen fuera de columnas `name_es`, `name_fr`, `name_en`.
- La arquitectura está preparada para Booking pero no implementa una integración real todavía.

## 3. Tablas principales

### Usuario y seguridad

- `profiles`: usuarios autenticados con datos personales y rol.
- `roles`: roles del sistema.
- `permissions`: permisos granulares.
- `role_permissions`: relación entre rol y permisos.
- `audit_logs`: trazabilidad de acciones importantes.

### Apartamentos

- `apartments`: propiedades con datos operativos.
- `apartment_translations`: contenido por idioma.
- `apartment_images`: fotos almacenadas en Supabase Storage.
- `amenities`: catálogo de servicios.
- `amenity_translations`: nombres traducidos.
- `apartment_amenities`: relación entre apartamentos y servicios.

### Reservas

- `customers`: clientes contactados o registrados.
- `reservation_requests`: solicitud inicial desde el sitio web.
- `reservations`: reserva confirmada, que bloquea disponibilidad.
- `payments`: comprobación de transferencia y validación del pago.
- `blocked_dates`: fechas bloqueadas por mantenimiento u otros motivos.
- `pricing_rules`: reglas y override de precio.

### Configuración y preparación para integraciones

- `settings`: configuración global del sistema.
- `bank_details`: datos bancarios para transferencias.
- `content_translations`: textos de interfaz, legales y emails.
- `external_channels`: canales externos como Booking o channel manager.
- `external_property_mappings`: mapeo apartamento → propiedad externa.
- `external_reservations`: reservas o sincronizaciones futuras del exterior.

## 4. Prevención de dobles reservas

La validación se implementa en PostgreSQL con una trigger `check_reservation_overlap`.

La regla principal es:

- Si dos reservas confirmadas del mismo apartamento se solapan en intervalos de fechas, la segunda debe rechazarse.

Esto evita duplicados aunque el frontend se salte la validación.

## 5. Preparación para Booking

No se implementa la integración real todavía, pero la capa queda preparada con:

- `external_channels`
- `external_property_mappings`
- `external_reservations`

Esto permite integrar Booking o un channel manager más adelante sin romper la lógica de reservas y disponibilidad.

## 6. Recomendación para la siguiente fase

La siguiente fase debería ser:

1. crear las migraciones de Supabase
2. insertar datos base para roles y permisos
3. preparar Storage buckets
4. definir el seed inicial de idiomas y propiedades
5. empezar con el flujo de apartamentos y solicitudes

## 7. Puntos críticos a recordar

- `reservation_requests` y `reservations` no se mezclan.
- `payments` se gestiona por separado.
- `profiles` es para usuarios administrativos, no para clientes web sin cuenta.
- `customers` es para clientes del negocio y su historial.
- Los roles tienen permisos granulares y se protegen con RLS.
