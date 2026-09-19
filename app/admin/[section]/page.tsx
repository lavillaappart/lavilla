import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServerComponentClient } from '@/lib/supabase-server';
import SessionControls from '@/components/session-controls';
import RequestActions from '@/components/request-actions';
import DeleteReservationButton from '@/components/delete-reservation-button';
import Brand from '@/components/brand';

function parseProofLinks(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      }
    } catch {
      // keep compatibility with old single-string proof_url values
    }

    return [trimmed];
  }

  return [];
}

function parseRequiredDocuments(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return value
    .split(/\n|\r|\||;/)
    .map((item) => item.replace(/^[-•*\s]+/, '').trim())
    .filter((item) => item.length > 0)
    .slice(0, 10);
}

const sections = {
  solicitudes: { title: 'Demandes de réservation', eyebrow: 'Demandes', description: 'Traitez les demandes reçues et contactez les voyageurs.', table: 'reservation_requests' },
  reservas: { title: 'Réservations', eyebrow: 'Réservations', description: 'Consultez les séjours confirmés et leur état.', table: 'reservations' },
  llegadas: { title: 'Prochaines arrivées', eyebrow: 'Arrivées', description: 'Les voyageurs attendus dans les sept prochains jours.', table: 'reservations' },
  salidas: { title: 'Prochains départs', eyebrow: 'Départs', description: 'Les sorties prévues dans les sept prochains jours.', table: 'reservations' },
  clientes: { title: 'Clients', eyebrow: 'Clients', description: 'Fiches clients et historique des séjours.', table: 'customers' },
  pagos: { title: 'Paiements', eyebrow: 'Paiements', description: 'Suivez les justificatifs et les paiements à vérifier.', table: 'payments' },
  calendario: { title: 'Calendrier de disponibilité', eyebrow: 'Calendrier', description: 'Vue rapide des réservations et des dates bloquées.', table: 'reservations' },
  ajustes: { title: 'Configuration', eyebrow: 'Configuration', description: 'Paramètres de la plateforme et informations bancaires.', table: 'settings' }
} as const;

type SectionKey = keyof typeof sections;

export default async function AdminSectionPage({ params }: { params: { section: string } }) {
  if (!(params.section in sections)) notFound();
  const section = sections[params.section as SectionKey];
  const supabase = createServerComponentClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role_id').eq('id', sessionData.session.user.id).maybeSingle();
  const { data: role } = await supabase.from('roles').select('slug').eq('id', profile?.role_id ?? '').maybeSingle();
  if (!['owner', 'admin', 'coadmin', 'staff'].includes(role?.slug ?? '')) redirect('/compte');

  const today = new Date().toISOString().slice(0, 10);
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeek = nextWeekDate.toISOString().slice(0, 10);
  let query = supabase.from(section.table).select('*').order(params.section === 'ajustes' ? 'updated_at' : 'created_at', { ascending: false }).limit(50);

  if (params.section === 'llegadas') query = supabase.from('reservations').select('*').eq('status', 'confirmed').gte('check_in', today).lte('check_in', nextWeek).order('check_in');
  if (params.section === 'salidas') query = supabase.from('reservations').select('*').eq('status', 'confirmed').gte('check_out', today).lte('check_out', nextWeek).order('check_out');
  if (params.section === 'reservas') query = supabase.from('reservations').select('*').order('check_in');
  if (params.section === 'pagos') query = supabase.from('payments').select('*').order('created_at', { ascending: false });

  const { data, error } = await query;
  const rows = (data ?? []) as Record<string, unknown>[];

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav"><Brand href="/admin" admin /><div><Link href="/admin">Dashboard</Link><SessionControls isAuthenticated isAdmin /></div></nav>
      <header className="dashboard-header admin-page-header"><div><p className="eyebrow">{section.eyebrow} · {role?.slug}</p><h1>{section.title}</h1><p>{section.description}</p></div><Link className="admin-back-link" href="/admin">← Dashboard</Link></header>
      {error ? <p className="dashboard-empty">Erreur Supabase: {error.message}</p> : rows.length === 0 ? <p className="dashboard-empty">Aucun élément à afficher pour le moment.</p> : <section className="admin-data-list">{rows.map((row, index) => {
      const proofLinks = params.section === 'pagos' ? parseProofLinks(row.proof_url) : [];
      const requiredDocuments = params.section === 'solicitudes' ? parseRequiredDocuments(row.special_requests) : [];
      return (
        <article className="admin-data-row" key={String(row.id ?? index)}>
          <div>
            <strong>{getPrimaryLabel(params.section, row)}</strong>
            <small>{getSecondaryLabel(params.section, row)}</small>
            {params.section === 'solicitudes' && requiredDocuments.length > 0 ? (
              <div className="admin-doc-list">
                <span>Documents requis</span>
                <ul>
                  {requiredDocuments.map((doc) => <li key={doc}>{doc}</li>)}
                </ul>
              </div>
            ) : null}
            {params.section === 'pagos' && proofLinks.length > 0 ? (
              <div className="payment-proof-links admin">
                {proofLinks.map((url, proofIndex) => (
                  <a key={`${url}-${proofIndex}`} className="payment-proof-link admin" href={url} target="_blank" rel="noreferrer">
                    Voir document {proofIndex + 1}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <span>{getStatus(row)}</span>
          <b>{getAmount(row)}</b>
          {params.section === 'solicitudes' ? <RequestActions requestId={String(row.id)} status={String(row.status ?? '')} /> : null}
          {params.section === 'solicitudes' || params.section === 'reservas' ? <DeleteReservationButton table={params.section === 'solicitudes' ? 'reservation_requests' : 'reservations'} rowId={String(row.id)} status={String(row.status ?? '')} /> : null}
        </article>
      );
  })}</section>}
    </main>
  );
}

function getPrimaryLabel(section: string, row: Record<string, unknown>) {
  if (section === 'clientes') return `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || String(row.email ?? 'Client');
  if (section === 'pagos') return `Paiement ${String(row.id ?? '').slice(0, 8)}`;
  if (section === 'ajustes') return String(row.key ?? 'Paramètre');
  if (section === 'calendario') return `Appartement ${String(row.apartment_id ?? '').slice(0, 8)}`;
  return `Référence ${String(row.id ?? '').slice(0, 8)}`;
}

function getSecondaryLabel(section: string, row: Record<string, unknown>) {
  if (section === 'clientes') return String(row.email ?? row.phone ?? '');
  if (section === 'solicitudes') return `${row.check_in ?? ''} → ${row.check_out ?? ''} · ${row.guests_count ?? 0} voyageurs`;
  if (section === 'llegadas') return `Arrivée: ${row.check_in ?? ''} · ${row.guests_count ?? 0} voyageurs`;
  if (section === 'salidas') return `Départ: ${row.check_out ?? ''} · ${row.guests_count ?? 0} voyageurs`;
  if (section === 'reservas') return `${row.check_in ?? ''} → ${row.check_out ?? ''} · ${row.guests_count ?? 0} voyageurs`;
  if (section === 'pagos') {
    const proofCount = parseProofLinks(row.proof_url).length;
    return `${row.amount ?? 0} ${row.currency ?? 'MAD'} · ${row.payment_method ?? 'bank_transfer'}${proofCount > 0 ? ` · ${proofCount} document${proofCount > 1 ? 's' : ''}` : ''}`;
  }
  if (section === 'ajustes') return String(row.description ?? '');
  return `${row.check_in ?? ''} → ${row.check_out ?? ''}`;
}

function getStatus(row: Record<string, unknown>) { return String(row.status ?? 'active'); }
function getAmount(row: Record<string, unknown>) { return row.total_price ? `${row.total_price} ${row.currency ?? 'MAD'}` : ''; }
