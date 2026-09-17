import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@/lib/supabase-server';
import SessionControls from '@/components/session-controls';
import Brand from '@/components/brand';

type Reservation = {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  total_price: number;
  currency: string;
  apartments: { slug: string }[];
};

export default async function ReservationsPage() {
  const supabase = createServerComponentClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) redirect('/login');

  const { data } = await supabase
    .from('reservations')
    .select('id, check_in, check_out, status, total_price, currency, apartments(slug)')
    .order('check_in', { ascending: false });

  const reservations = (data ?? []) as Reservation[];

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav"><Brand /><div><Link href="/compte">Mon profil</Link><Link href="/appartements">Appartements</Link><SessionControls isAuthenticated /></div></nav>
      <header className="dashboard-header"><p className="eyebrow">Espace client</p><h1>Vos demandes et réservations.</h1><p>Retrouvez ici le suivi de vos séjours et les informations importantes.</p></header>
      <section className="reservation-list">
        {reservations.length === 0 ? <article className="dashboard-empty"><h2>Aucune réservation pour le moment.</h2><p>Complétez votre profil puis choisissez un appartement pour envoyer votre première demande.</p><Link className="dashboard-action" href="/appartements">Explorer les appartements</Link></article> : reservations.map((reservation) => <article className="reservation-row" key={reservation.id}><div><span className="eyebrow">{reservation.status}</span><h2>{reservation.apartments[0]?.slug ?? 'Appartement'}</h2></div><p>{reservation.check_in} → {reservation.check_out}</p><strong>{reservation.total_price} {reservation.currency}</strong></article>)}
      </section>
    </main>
  );
}
