import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerComponentClient } from '@/lib/supabase-server';
import ProfileCompletionForm from '@/components/profile-completion-form';

export default async function ComptePage() {
  const supabase = createServerComponentClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('full_name, address, country, phone, whatsapp_phone').eq('id', sessionData.session.user.id).maybeSingle();
  const values = { fullName: profile?.full_name ?? sessionData.session.user.user_metadata?.full_name ?? '', address: profile?.address ?? '', country: profile?.country ?? '', phone: profile?.whatsapp_phone ?? profile?.phone ?? '' };
  const complete = Object.values(values).every(Boolean);

  return (
    <main className="auth-page">
      <div className="auth-visual"><Link className="brand auth-brand" href="/"><span className="brand-mark" /> La Villa</Link><div><p className="eyebrow">Votre espace voyageur</p><h1>Tout est prêt pour votre séjour.</h1><p>Gardez vos informations à jour pour recevoir nos réponses rapidement sur WhatsApp.</p></div></div>
      <section className="auth-panel"><Link className="auth-back" href="/">← Retour à l&apos;accueil</Link><div className="auth-heading"><p className="eyebrow">Espace client</p><h2>{complete ? 'Votre profil' : 'Complétez votre profil'}</h2><p>{complete ? 'Vos informations sont prêtes pour vos demandes de réservation.' : 'Ces informations sont obligatoires avant toute demande de réservation.'}</p></div><div className="client-panel-links"><Link href="/appartements">Explorer les appartements <span>↗</span></Link><Link href="/reservations">Mes demandes et réservations <span>↗</span></Link></div><ProfileCompletionForm initialValues={values} /><p className="auth-switch"><Link href="/appartements">Voir les appartements ↗</Link></p></section>
    </main>
  );
}
