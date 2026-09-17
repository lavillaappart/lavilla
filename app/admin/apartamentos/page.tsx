import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@/lib/supabase-server';
import SessionControls from '@/components/session-controls';
import ApartmentForm from '@/components/apartment-form';
import DeleteApartmentButton from '@/components/delete-apartment-button';

export default async function AdminApartamentosPage() {
  const supabase = createServerComponentClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role_id').eq('id', sessionData.session.user.id).maybeSingle();
  const { data: role } = await supabase.from('roles').select('slug').eq('id', profile?.role_id ?? '').maybeSingle();
  if (!['owner', 'admin'].includes(role?.slug ?? '')) redirect('/admin');

  const { data: apartments } = await supabase.from('apartments').select('id, slug, city, status, capacity, base_price, apartment_translations(name), apartment_images(storage_path)').order('created_at', { ascending: false });

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav"><Link className="brand" href="/admin"><span className="brand-mark" /> La Villa · Admin</Link><div><Link href="/admin">Dashboard</Link><SessionControls isAuthenticated isAdmin /></div></nav>
      <header className="dashboard-header admin-page-header"><div><p className="eyebrow">Gestion des propriétés</p><h1>Ajouter un appartement.</h1><p>Créez une fiche complète, ajoutez les photos et publiez-la quand elle est prête.</p></div><Link className="admin-back-link" href="/admin">← Dashboard</Link></header>
      <div className="admin-apartment-layout"><section><ApartmentForm /></section><aside className="admin-side-panel"><p className="eyebrow">Conseil</p><h2>Une bonne fiche vend mieux.</h2><p>Utilisez un nom clair, une description concrète et des photos lumineuses. La première photo sera la couverture publique.</p></aside></div>
      <section className="admin-apartment-list"><div className="admin-section-heading"><div><p className="eyebrow">Catalogue</p><h2>Appartements existants</h2></div></div>{apartments?.length ? <div className="admin-table">{apartments.map((apartment) => <div className="admin-table-row" key={apartment.id}><div><strong>{apartment.apartment_translations[0]?.name ?? apartment.slug}</strong><small>{apartment.city} · {apartment.capacity} voyageurs</small></div><span>{apartment.status}</span><strong>{apartment.base_price} MAD</strong><div className="table-actions"><Link className="table-action" href={`/admin/apartamentos/${apartment.id}`}>Modifier</Link><DeleteApartmentButton apartmentId={apartment.id} imagePaths={apartment.apartment_images.map((image) => image.storage_path)} /></div></div>)}</div> : <p className="dashboard-empty">Aucun appartement enregistré.</p>}</section>
    </main>
  );
}
