import AuthForm from '@/components/auth-form';

export default function LoginPage() {
  return (
    <main style={{ padding: '2rem', minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <section>
        <h1>Acceso administrativo</h1>
        <AuthForm />
      </section>
    </main>
  );
}
