import Link from 'next/link';
import RegisterForm from '@/components/register-form';

export default function RegistroPage() {
  return (
    <main className="auth-page">
      <div className="auth-visual"><Link className="brand auth-brand" href="/"><span className="brand-mark" /> La Villa</Link><div><p className="eyebrow">Votre séjour commence ici</p><h1>Créez votre espace voyageur.</h1><p>Pour envoyer une demande de réservation, nous avons besoin de quelques informations essentielles.</p></div></div>
      <section className="auth-panel"><Link className="auth-back" href="/">← Retour à l&apos;accueil</Link><div className="auth-heading"><p className="eyebrow">Nouveau voyageur</p><h2>Créer un compte</h2><p>Vos informations restent privées et servent uniquement à gérer votre séjour.</p></div><RegisterForm /><p className="auth-switch">Vous avez déjà un compte ? <Link href="/login">Se connecter</Link></p></section>
    </main>
  );
}
