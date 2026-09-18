import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServerComponentClient } from '@/lib/supabase-server';
import Brand from '@/components/brand';
import SessionControls from '@/components/session-controls';

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'En attente',
    contacted: 'Contacté',
    awaiting_payment: 'En attente de paiement',
    payment_received: 'Paiement reçu',
    confirmed: 'Confirmée',
    rejected: 'Refusée',
    cancelled: 'Annulée',
    expired: 'Expirée'
  };
  return map[status] ?? status;
}

function getStayNights(checkIn: string, checkOut: string) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function getStayTotal(checkIn: string, checkOut: string, nightlyPrice: number | null | undefined) {
  const nights = getStayNights(checkIn, checkOut);
  return nights > 0 ? nights * Number(nightlyPrice ?? 0) : 0;
}

export default async function ReservationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect('/login');

  const email = (userData.user.email ?? '').trim().toLowerCase();
  const { data: customer } = await supabase
    .from('customers')
    .select('id, email')
    .ilike('email', email)
    .maybeSingle();

  if (!customer) redirect('/compte');

  const { data: reservation, error } = await supabase
    .from('reservation_requests')
    .select('id, check_in, check_out, guests_count, status, payment_method, payment_amount, special_requests, apartment_id, apartments(id, slug, city, base_price, currency, apartment_translations(locale, name, short_description))')
    .eq('id', params.id)
    .eq('customer_id', customer.id)
    .maybeSingle();

  if (error || !reservation) notFound();

  const apartment = Array.isArray(reservation.apartments) ? reservation.apartments[0] : reservation.apartments;
  const translation = Array.isArray(apartment?.apartment_translations) ? apartment.apartment_translations.find((item: { locale: string }) => item.locale === 'fr') ?? apartment.apartment_translations[0] : null;

  const stayTotal = getStayTotal(reservation.check_in, reservation.check_out, apartment?.base_price);
  const paymentLabel = reservation.payment_method === 'bank_transfer'
    ? 'Virement bancaire'
    : reservation.payment_method === 'partial_now'
      ? `Paiement partiel (${reservation.payment_amount ?? 0} ${apartment?.currency ?? 'MAD'})`
      : 'Paiement à l’arrivée';
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '33600000000';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Bonjour, je souhaite accélérer ma réservation ${translation?.name ?? apartment?.slug ?? 'de l’appartement'} du ${reservation.check_in} au ${reservation.check_out}. Merci.`)}`;

  return (
    <main className="dashboard-page reservation-detail-page">
      <nav className="dashboard-nav">
        <Brand />
        <div>
          <Link href="/reservations">Mes réservations</Link>
          <Link href="/compte">Mon profil</Link>
          <SessionControls isAuthenticated />
        </div>
      </nav>

      <header className="dashboard-header reservation-detail-header">
        <p className="eyebrow">Réservation</p>
        <h1>{translation?.name ?? apartment?.slug ?? 'Votre séjour'}</h1>
        <p>{apartment?.city ?? 'Votre appartement'} · {statusLabel(reservation.status)}</p>
      </header>

      <section className="reservation-detail-card">
        <div className="reservation-detail-topline">
          <span className="reservation-status-badge">{statusLabel(reservation.status)}</span>
          <span className="reservation-meta">{apartment?.city ?? 'Votre appartement'}</span>
        </div>

        <div className="reservation-detail-grid">
          <div className="reservation-detail-item">
            <span className="eyebrow">Dates</span>
            <strong>{reservation.check_in} → {reservation.check_out}</strong>
          </div>
          <div className="reservation-detail-item">
            <span className="eyebrow">Voyageurs</span>
            <strong>{reservation.guests_count}</strong>
          </div>
          <div className="reservation-detail-item">
            <span className="eyebrow">Montant total</span>
            <strong>{stayTotal} {apartment?.currency ?? 'MAD'}</strong>
          </div>
          <div className="reservation-detail-item">
            <span className="eyebrow">Paiement</span>
            <strong>{paymentLabel}</strong>
          </div>
        </div>

        <div className="reservation-detail-notes">
          <h2>Votre demande</h2>
          <p>{reservation.special_requests || 'Aucune demande particulière.'}</p>
        </div>

        <div className="reservation-detail-actions">
          <Link className="dashboard-action primary" href="/reservations">Voir toutes mes réservations</Link>
          <a className="dashboard-action whatsapp-action" href={whatsappUrl} target="_blank" rel="noreferrer">Accelerer ma réservation</a>
          <Link className="text-link" href={`/appartements/${apartment?.slug ?? ''}`}>Retour à l’appartement</Link>
        </div>
      </section>
    </main>
  );
}
