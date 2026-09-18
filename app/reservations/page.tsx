import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@/lib/supabase-server';
import SessionControls from '@/components/session-controls';
import Brand from '@/components/brand';
import PaymentProofUpload from '@/components/payment-proof-upload';

type Reservation = {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  payment_method?: string;
  payment_amount?: number | null;
  total_price?: number | null;
  special_requests?: string | null;
  notes?: string | null;
  apartments?: { slug?: string; currency?: string; base_price?: number | null } | { slug?: string; currency?: string; base_price?: number | null }[] | null;
  apartment_id?: string;
  request_id?: string | null;
  reservation_id?: string | null;
  source?: 'request' | 'reservation';
};

function getApartmentDetails(apartments: Reservation['apartments']) {
  const normalized = Array.isArray(apartments) ? apartments : apartments ? [apartments] : [];
  return normalized[0] ?? { slug: 'Appartement', currency: 'MAD', base_price: 0 };
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

function requiredDocuments(status: string) {
  if (!['confirmed', 'payment_received', 'awaiting_payment'].includes(status)) return [];
  return [
    'CIN / passeport',
    'Preuve de paiement',
    'Acte de mariage si applicable',
    'Informations supplémentaires demandées par l’hôtel'
  ];
}

function buildWhatsAppUrl(number: string, reservation: { apartmentName?: string; check_in: string; check_out: string; status?: string }) {
  const message = encodeURIComponent(
    `Bonjour, je souhaite accélérer ma réservation ${reservation.apartmentName ?? 'de l’appartement'} du ${reservation.check_in} au ${reservation.check_out}. Je suis actuellement en statut ${reservation.status ?? ''}. Merci.`
  );
  return `https://wa.me/${number}?text=${message}`;
}

export default async function ReservationsPage() {
  const supabase = createServerComponentClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect('/login');

  const email = (userData.user.email ?? '').trim().toLowerCase();

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (!customer) {
    return (
      <main className="dashboard-page">
        <nav className="dashboard-nav"><Brand /><div><Link href="/compte">Mon profil</Link><Link href="/appartements">Appartements</Link><SessionControls isAuthenticated /></div></nav>
        <header className="dashboard-header"><p className="eyebrow">Espace client</p><h1>Vos demandes et réservations.</h1><p>Complétez votre profil pour voir les demandes déjà enregistrées.</p></header>
        <section className="reservation-list">
          <article className="dashboard-empty">
            <h2>Aucune réservation pour le moment.</h2>
            <p>Complétez votre profil puis choisissez un appartement pour créer votre première demande.</p>
            <Link className="dashboard-action" href="/compte">Compléter mon profil</Link>
          </article>
        </section>
      </main>
    );
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '33600000000';

  const [requestsResult, reservationsResult] = await Promise.all([
    supabase
      .from('reservation_requests')
      .select('id, check_in, check_out, status, payment_method, payment_amount, special_requests, apartment_id, customer_id, apartments(slug, currency, base_price)')
      .eq('customer_id', customer.id)
      .order('check_in', { ascending: false }),
    supabase
      .from('reservations')
      .select('id, request_id, check_in, check_out, status, total_price, currency, payment_method, payment_amount, notes, apartment_id, customer_id, apartments(slug, currency, base_price)')
      .eq('customer_id', customer.id)
      .order('check_in', { ascending: false })
  ]);

  const requests = (requestsResult.data ?? []) as Reservation[];
  const confirmedReservations = (reservationsResult.data ?? []) as Reservation[];

  const reservations = [
    ...requests.map((request) => {
      const apartment = getApartmentDetails(request.apartments);
      return {
        ...request,
        source: 'request' as const,
        total_price: Number(getStayTotal(request.check_in, request.check_out, apartment.base_price)) || request.payment_amount || null,
        payment_method: request.payment_method ?? 'bank_transfer',
        payment_amount: request.payment_amount ?? null,
        special_requests: request.special_requests ?? null,
        notes: request.special_requests ?? null
      };
    }),
    ...confirmedReservations.map((reservation) => ({
      ...reservation,
      source: 'reservation' as const,
      payment_method: reservation.payment_method ?? 'bank_transfer',
      payment_amount: reservation.payment_amount ?? reservation.total_price ?? null,
      total_price: reservation.total_price ?? null,
      special_requests: reservation.notes ?? null,
      notes: reservation.notes ?? null
    }))
  ].sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav"><Brand /><div><Link href="/compte">Mon profil</Link><Link href="/appartements">Appartements</Link><SessionControls isAuthenticated /></div></nav>
      <header className="dashboard-header"><p className="eyebrow">Espace client</p><h1>Vos demandes et réservations.</h1><p>Retrouvez ici le suivi de vos séjours et les informations importantes.</p></header>
      <section className="reservation-list">
        {reservations.length === 0 ? <article className="dashboard-empty"><h2>Aucune réservation pour le moment.</h2><p>Complétez votre profil puis choisissez un appartement pour envoyer votre première demande.</p><Link className="dashboard-action" href="/appartements">Explorer les appartements</Link></article> : <>
          {reservations.map((reservation) => {
            const apartment = getApartmentDetails(reservation.apartments);
            const stayTotal = Number(reservation.total_price ?? getStayTotal(reservation.check_in, reservation.check_out, apartment.base_price) ?? 0);
            const paymentMessage = reservation.payment_method === 'bank_transfer'
              ? 'Paiement total · Virement bancaire'
              : reservation.payment_method === 'partial_now'
                ? `Paiement partiel · ${reservation.payment_amount ?? 0} ${apartment.currency ?? 'MAD'} / Total ${stayTotal} ${apartment.currency ?? 'MAD'}`
                : 'Paiement à l’arrivée · Total à régler sur place';

            const notesText = reservation.special_requests || reservation.notes || 'Aucune demande particulière.';
            const docs = requiredDocuments(reservation.status);
            const whatsappUrl = buildWhatsAppUrl(whatsappNumber, { apartmentName: apartment.slug ?? 'Appartement', check_in: reservation.check_in, check_out: reservation.check_out, status: reservation.status });
            const requestId = reservation.source === 'reservation' ? (reservation.request_id ?? reservation.id) : reservation.id;
            const reservationId = reservation.source === 'reservation' ? reservation.id : null;

            return <article className="reservation-row" key={`${reservation.source}-${reservation.id}`}><div><span className="eyebrow">{statusLabel(reservation.status)}</span><h2>{apartment.slug ?? 'Appartement'}</h2></div><div className="reservation-meta-block"><p>{reservation.check_in} → {reservation.check_out}</p><strong>{stayTotal} {apartment.currency ?? 'MAD'}</strong><small>{paymentMessage}</small>{notesText ? <p className="reservation-comment">{notesText}</p> : null}</div><div className="reservation-side-panel">{docs.length > 0 ? <div className="reservation-docs"><strong>Documents requis</strong><ul>{docs.map((doc) => <li key={doc}>{doc}</li>)}</ul></div> : <div className="reservation-docs empty"><strong>Contact</strong><p>Besoin d’accélérer votre réservation ?</p></div>}<PaymentProofUpload requestId={requestId} amount={Number(stayTotal || 0)} currency={apartment.currency ?? 'MAD'} paymentMethod={reservation.payment_method ?? 'bank_transfer'} status={reservation.status} reservationId={reservationId} /><a className="whatsapp-link" href={whatsappUrl} target="_blank" rel="noreferrer">Accelerer ma réservation</a></div></article>;
          })}
        </>}
      </section>
    </main>
  );
}
