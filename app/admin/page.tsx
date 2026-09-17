import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerComponentClient } from '@/lib/supabase-server';
import SessionControls from '@/components/session-controls';

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

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav"><Link className="brand" href="/"><span className="brand-mark" /> La Villa</Link><div><Link href="/compte">Espace client</Link><SessionControls isAuthenticated /></div></nav>
      <header className="dashboard-header"><p className="eyebrow">Espace administration</p><h1>Bonjour, votre journée en un coup d&apos;œil.</h1><p>Gérez les demandes, les arrivées et les appartements depuis un seul espace.</p></header>
      <section className="dashboard-grid"><article><span>Demandes en attente</span><strong>—</strong><Link href="/admin">Voir les demandes ↗</Link></article><article><span>Arrivées prochaines</span><strong>—</strong><Link href="/admin">Ouvrir le calendrier ↗</Link></article><article><span>Paiements à vérifier</span><strong>—</strong><Link href="/admin">Voir les paiements ↗</Link></article></section>
      <section className="dashboard-content"><h2>Prochaines actions</h2><p>Le tableau de bord sera relié aux réservations et aux paiements manuels dans la prochaine étape.</p></section>
    </main>
  );
}
