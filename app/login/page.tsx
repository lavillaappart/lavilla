import AuthForm from '@/components/auth-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <main style={{ padding: '2rem', minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <section>
        <h1>Acceso administrativo</h1>
        <AuthForm />
        <p><Link href="/registro">Créer un compte voyageur</Link></p>
      </section>
    </main>
  );
}
