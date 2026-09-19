import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerComponentClient } from '@/lib/supabase-server';
import SessionControls from '@/components/session-controls';
import Brand from '@/components/brand';

export default async function AdminPage() {
  const supabase = createServerComponentClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role_id')
    .eq('id', session.user.id)
    .maybeSingle();

  const { data: roleData } = await supabase
    .from('roles')
    .select('slug')
    .eq('id', profile?.role_id ?? '')
    .maybeSingle();

  const role = roleData?.slug;
  if (!['owner', 'admin', 'coadmin', 'staff'].includes(role ?? '')) {
    redirect('/compte');
  }

  const today = new Date();
  const todayValue = today.toISOString().slice(0, 10);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const nextWeekValue = nextWeek.toISOString().slice(0, 10);

  const [pendingRequests, confirmedReservations, cancelledReservations, upcomingArrivals, upcomingDepartures, pendingPayments, activeApartments, occupiedApartments] = await Promise.all([
    supabase.from('reservation_requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'contacted', 'awaiting_payment']),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('reservation_requests').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').gte('check_in', todayValue).lte('check_in', nextWeekValue),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').gte('check_out', todayValue).lte('check_out', nextWeekValue),
    supabase.from('payments').select('id', { count: 'exact', head: true }).in('status', ['pending', 'proof_received']),
    supabase.from('apartments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('reservations').select('apartment_id', { count: 'exact', head: false }).eq('status', 'confirmed').lte('check_in', todayValue).gt('check_out', todayValue)
  ]);

  const activeCount = activeApartments.count ?? 0;
  const occupiedIds = new Set((occupiedApartments.data ?? []).map((reservation) => reservation.apartment_id));

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav"><Brand href="/admin" admin /><div><SessionControls isAuthenticated isAdmin /></div></nav>
      <header className="dashboard-header dashboard-header-compact"><div><p className="eyebrow">Espace administration · {role}</p><h1>Tableau de bord</h1><p>Vue opérationnelle des locations, réservations et paiements.</p></div><time dateTime={todayValue}>{today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</time></header>
      <section className="dashboard-grid">
        <DashboardCard label="Demandes en attente" value={pendingRequests.count ?? 0} href="/admin/solicitudes" />
        <DashboardCard label="Réservations confirmées" value={confirmedReservations.count ?? 0} href="/admin/reservas" />
        <DashboardCard label="Réservations annulées" value={cancelledReservations.count ?? 0} href="/admin/anuladas" />
        <DashboardCard label="Paiements à vérifier" value={pendingPayments.count ?? 0} href="/admin/pagos" />
        <DashboardCard label="Arrivées · 7 jours" value={upcomingArrivals.count ?? 0} href="/admin/llegadas" />
        <DashboardCard label="Départs · 7 jours" value={upcomingDepartures.count ?? 0} href="/admin/salidas" />
        <DashboardCard label="Appartements disponibles" value={Math.max(activeCount - occupiedIds.size, 0)} href="/admin/apartamentos" />
      </section>
      <section className="admin-tools">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">Gestion</p>
            <h2>Outils d&apos;administration</h2>
          </div>
          <Link href="/admin/calendario">Ouvrir le calendrier ↗</Link>
        </div>
        <div className="tool-grid">
          <AdminTool href="/admin/calendario" title="Calendrier" description="Disponibilité, réservations et blocages." icon="▦" />
          <AdminTool href="/admin/llegadas" title="Prochaines arrivées" description="Clients, horaires et paiements." icon="↓" />
          <AdminTool href="/admin/salidas" title="Prochains départs" description="Sorties et notes opérationnelles." icon="↑" />
          <AdminTool href="/admin/solicitudes" title="Demandes" description="Traiter les nouvelles demandes." icon="○" />
          <AdminTool href="/admin/reservas" title="Réservations" description="Réservations confirmées." icon="□" />
          <AdminTool href="/admin/anuladas" title="Annulées" description="Historique et motifs d’annulation." icon="✕" />
          <AdminTool href="/admin/clientes" title="Clients" description="Fiches et historique client." icon="◌" />
          <AdminTool href="/admin/apartamentos" title="Appartements" description="Propriétés, photos et tarifs." icon="⌂" />
          <AdminTool href="/admin/pagos" title="Paiements" description="Justificatifs et vérifications." icon="€" />
          <AdminTool href="/admin/ajustes" title="Configuration" description="Banca, idiomas y reglas del sistema." icon="⚙" />
        </div>
      </section>
    </main>
  );
}

function DashboardCard({ label, value, href }: { label: string; value: number; href: string }) {
  return <Link className="dashboard-card" href={href}><span>{label}</span><strong>{value}</strong><small>Ouvrir ↗</small></Link>;
}

function AdminTool({ href, title, description, icon }: { href: string; title: string; description: string; icon: string }) {
  return <Link className="admin-tool" href={href}><span className="tool-icon" aria-hidden="true">{icon}</span><span><strong>{title}</strong><small>{description}</small></span><b>↗</b></Link>;
}
