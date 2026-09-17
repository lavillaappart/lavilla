import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@/lib/supabase-server';

export default async function AdminPage() {
  const supabase = createServerComponentClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Panel administrativo</h1>
      <p>Acceso correcto.</p>
      <p>Este panel quedará conectado a reservas, clientes y calendario.</p>
    </main>
  );
}
