import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServerComponentClient } from '@/lib/supabase-server';
import Brand from '@/components/brand';
import SessionControls from '@/components/session-controls';
import DeleteReservationButton from '@/components/delete-reservation-button';

const sections = {
  solicitudes: { title: 'Demande de réservation', table: 'reservation_requests' },
  reservas: { title: 'Réservation', table: 'reservations' },
  llegadas: { title: 'Arrivée', table: 'reservations' },
  salidas: { title: 'Départ', table: 'reservations' },
  clientes: { title: 'Client', table: 'customers' },
  pagos: { title: 'Paiement', table: 'payments' },
  calendario: { title: 'Calendrier', table: 'reservations' },
  ajustes: { title: 'Paramètre', table: 'settings' }
} as const;

type SectionKey = keyof typeof sections;

function getStatusLabel(status: unknown) {
  const value = String(status ?? 'pending');
  const map: Record<string, string> = {
    pending: 'En attente',
    contacted: 'Contacté',
    awaiting_payment: 'Paiement attendu',
    payment_received: 'Paiement reçu',
    confirmed: 'Confirmée',
    rejected: 'Refusée',
    cancelled: 'Annulée',
    expired: 'Expirée'
  };
  return map[value] ?? value;
}

export default async function AdminDetailPage({ params }: { params: { section: string; id: string } }) {
  if (!(params.section in sections)) notFound();
  const section = sections[params.section as SectionKey];
  const supabase = createServerComponentClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role_id').eq('id', sessionData.session.user.id).maybeSingle();
  const { data: role } = await supabase.from('roles').select('slug').eq('id', profile?.role_id ?? '').maybeSingle();
  if (!['owner', 'admin', 'coadmin', 'staff'].includes(role?.slug ?? '')) redirect('/compte');

  let query = supabase.from(section.table).select('*').eq('id', params.id).maybeSingle();

  if (params.section === 'solicitudes') {
    query = supabase.from('reservation_requests').select('*, customers(*), apartments(*)').eq('id', params.id).maybeSingle();
  }

  if (params.section === 'reservas' || params.section === 'llegadas' || params.section === 'salidas') {
    query = supabase.from('reservations').select('*, apartments(*)').eq('id', params.id).maybeSingle();
  }

  const { data, error } = await query;
  if (error || !data) notFound();

  const customer = params.section === 'solicitudes' ? ((data as Record<string, unknown>).customers as Record<string, unknown> | null) : null;
  const apartment = params.section === 'solicitudes' ? (((data as Record<string, unknown>).apartments as Record<string, unknown> | Record<string, unknown>[] | null) ?? null) : null;
  const apartmentDetails = Array.isArray(apartment) ? apartment[0] : apartment;
  const customerName = customer ? `${String(customer.first_name ?? '')} ${String(customer.last_name ?? '')}`.trim() || 'Client' : 'Client';
  const customerEmail = customer?.email ? String(customer.email) : '—';
  const customerPhone = customer?.phone ? String(customer.phone) : '—';
  const apartmentName = apartmentDetails?.slug ? String(apartmentDetails.slug) : 'Appartement';
  const apartmentCity = apartmentDetails?.city ? String(apartmentDetails.city) : '—';
  const apartmentAddress = apartmentDetails?.address ? String(apartmentDetails.address) : '—';
  const statusLabel = getStatusLabel((data as Record<string, unknown>).status);

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav">
        <Brand href="/admin" admin />
        <div>
          <Link href={`/admin/${params.section}`}>Retour à la liste</Link>
          <Link href="/admin">Dashboard</Link>
          <SessionControls isAuthenticated isAdmin />
        </div>
      </nav>

      <header className="dashboard-header admin-page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>{section.title}</h1>
          <p>Détails complets de l’élément sélectionné.</p>
        </div>
        <Link className="admin-back-link" href={`/admin/${params.section}`}>← Retour</Link>
      </header>

      <section className="dashboard-content">
        <div className="reservation-detail-card">
          <div className="reservation-detail-topline">
            <span className="reservation-status-badge">{statusLabel}</span>
            <span className="reservation-meta">Réf. {String((data as Record<string, unknown>).id ?? params.id).slice(0, 8)}</span>
          </div>

          <div className="reservation-detail-summary">
            <div className="summary-tile">
              <span>Client</span>
              <strong>{customerName}</strong>
              <small>{customerEmail}</small>
            </div>
            <div className="summary-tile">
              <span>Dates</span>
              <strong>{String((data as Record<string, unknown>).check_in ?? '—')} → {String((data as Record<string, unknown>).check_out ?? '—')}</strong>
              <small>{String((data as Record<string, unknown>).guests_count ?? 0)} voyageurs</small>
            </div>
            <div className="summary-tile">
              <span>Montant</span>
              <strong>{String((data as Record<string, unknown>).payment_amount ?? (data as Record<string, unknown>).total_price ?? '—')}</strong>
              <small>{String((data as Record<string, unknown>).payment_method ?? '—')}</small>
            </div>
            <div className="summary-tile">
              <span>Appartement</span>
              <strong>{apartmentName}</strong>
              <small>{apartmentCity}</small>
            </div>
          </div>

          <div className="reservation-detail-grid">
            <div className="reservation-detail-item">
              <span className="eyebrow">Dates</span>
              <strong>{String((data as Record<string, unknown>).check_in ?? '—')} → {String((data as Record<string, unknown>).check_out ?? '—')}</strong>
            </div>
            <div className="reservation-detail-item">
              <span className="eyebrow">Voyageurs</span>
              <strong>{String((data as Record<string, unknown>).guests_count ?? 0)}</strong>
            </div>
            <div className="reservation-detail-item">
              <span className="eyebrow">Mode de paiement</span>
              <strong>{String((data as Record<string, unknown>).payment_method ?? '—')}</strong>
            </div>
            <div className="reservation-detail-item">
              <span className="eyebrow">Montant</span>
              <strong>{String((data as Record<string, unknown>).payment_amount ?? (data as Record<string, unknown>).total_price ?? '—')}</strong>
            </div>
          </div>

          <div className="reservation-detail-panel-grid">
            <div className="reservation-detail-panel">
              <h2>Informations client</h2>
              <ul>
                <li><span>Nom</span><strong>{customerName}</strong></li>
                <li><span>Email</span><strong>{customerEmail}</strong></li>
                <li><span>Téléphone</span><strong>{customerPhone}</strong></li>
                <li><span>Source</span><strong>{String((data as Record<string, unknown>).source ?? 'website')}</strong></li>
              </ul>
            </div>
            <div className="reservation-detail-panel">
              <h2>Appartement</h2>
              <ul>
                <li><span>Nom</span><strong>{apartmentName}</strong></li>
                <li><span>Ville</span><strong>{apartmentCity}</strong></li>
                <li><span>Adresse</span><strong>{apartmentAddress}</strong></li>
                <li><span>Statut</span><strong>{String(apartmentDetails?.status ?? 'active')}</strong></li>
              </ul>
            </div>
          </div>

          <div className="reservation-detail-notes">
            <h2>Demande particulière</h2>
            <p>{String((data as Record<string, unknown>).special_requests ?? 'Aucune demande particulière.')}</p>
          </div>

          <div className="reservation-detail-actions">
            <Link className="dashboard-action primary" href={`/admin/${params.section}`}>Voir la liste</Link>
            {params.section === 'anuladas' || String((data as Record<string, unknown>).status ?? '') === 'cancelled' ? (
              <DeleteReservationButton table="reservation_requests" rowId={String((data as Record<string, unknown>).id ?? params.id)} status={String((data as Record<string, unknown>).status ?? '')} />
            ) : null}
            <Link className="text-link" href="/admin">Retour au dashboard</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
