import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServerComponentClient } from '@/lib/supabase-server';
import SessionControls from '@/components/session-controls';

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
  let query = supabase.from(section.table).select('*').order('created_at', { ascending: false }).limit(50);

  if (params.section === 'llegadas') query = supabase.from('reservations').select('*').eq('status', 'confirmed').gte('check_in', today).lte('check_in', nextWeek).order('check_in');
  if (params.section === 'salidas') query = supabase.from('reservations').select('*').eq('status', 'confirmed').gte('check_out', today).lte('check_out', nextWeek).order('check_out');
  if (params.section === 'reservas') query = supabase.from('reservations').select('*').order('check_in');
  if (params.section === 'pagos') query = supabase.from('payments').select('*').order('created_at', { ascending: false });

  const { data, error } = await query;
  const rows = (data ?? []) as Record<string, unknown>[];

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav"><Link className="brand" href="/admin"><span className="brand-mark" /> La Villa · Admin</Link><div><Link href="/admin">Dashboard</Link><SessionControls isAuthenticated isAdmin /></div></nav>
      <header className="dashboard-header admin-page-header"><div><p className="eyebrow">{section.eyebrow} · {role?.slug}</p><h1>{section.title}</h1><p>{section.description}</p></div><Link className="admin-back-link" href="/admin">← Dashboard</Link></header>
      {error ? <p className="dashboard-empty">Impossible de charger ces données. Vérifiez les politiques RLS.</p> : rows.length === 0 ? <p className="dashboard-empty">Aucun élément à afficher pour le moment.</p> : <section className="admin-data-list">{rows.map((row, index) => <article className="admin-data-row" key={String(row.id ?? index)}><div><strong>{getPrimaryLabel(params.section, row)}</strong><small>{getSecondaryLabel(params.section, row)}</small></div><span>{getStatus(row)}</span><b>{getAmount(row)}</b></article>)}</section>}
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
  if (section === 'pagos') return `${row.amount ?? 0} ${row.currency ?? 'MAD'} · ${row.payment_method ?? 'bank_transfer'}`;
  if (section === 'ajustes') return String(row.description ?? '');
  return `${row.check_in ?? ''} → ${row.check_out ?? ''}`;
}

function getStatus(row: Record<string, unknown>) { return String(row.status ?? 'active'); }
function getAmount(row: Record<string, unknown>) { return row.total_price ? `${row.total_price} ${row.currency ?? 'MAD'}` : ''; }
