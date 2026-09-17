import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServerComponentClient } from '@/lib/supabase-server';
import SessionControls from '@/components/session-controls';
import EditApartmentForm from '@/components/edit-apartment-form';
import Brand from '@/components/brand';

export default async function EditApartmentPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role_id').eq('id', sessionData.session.user.id).maybeSingle();
  const { data: role } = await supabase.from('roles').select('slug').eq('id', profile?.role_id ?? '').maybeSingle();
  if (!['owner', 'admin'].includes(role?.slug ?? '')) redirect('/admin');
  const { data: apartment } = await supabase.from('apartments').select('id, city, address, capacity, bedrooms, beds, bathrooms, surface_m2, base_price, min_stay_nights, max_stay_nights, check_in_time, check_out_time, apartment_translations(locale, name, short_description, description), apartment_images(id, storage_path, is_primary, sort_order)').eq('id', params.id).maybeSingle();
  if (!apartment) notFound();
  const translation = (Array.isArray(apartment.apartment_translations) ? apartment.apartment_translations.find((item) => item.locale === 'fr') : null) ?? null;
  const images = Array.isArray(apartment.apartment_images) ? apartment.apartment_images : [];
  return <main className="dashboard-page"><nav className="dashboard-nav"><Brand href="/admin" admin /><div><Link href="/admin/apartamentos">Catalogue</Link><SessionControls isAuthenticated isAdmin /></div></nav><header className="dashboard-header admin-page-header"><div><p className="eyebrow">Gestion des propriétés</p><h1>Modifier l’appartement.</h1><p>Actualisez les informations, le prix et la galerie.</p></div><Link className="admin-back-link" href="/admin/apartamentos">← Catalogue</Link></header><div className="admin-apartment-layout"><section><EditApartmentForm apartment={{ ...apartment, translation, images }} /></section></div></main>;
}
