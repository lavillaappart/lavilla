'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage('Sesión iniciada correctamente.');
    setLoading(false);
    window.location.href = '/admin';
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', maxWidth: 420 }}>
      <label>
        <div>Email</div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '0.75rem', borderRadius: 8 }}
        />
      </label>

      <label>
        <div>Contraseña</div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '0.75rem', borderRadius: 8 }}
        />
      </label>

      <button type="submit" disabled={loading} style={{ padding: '0.85rem', borderRadius: 8 }}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>

      {message ? <p>{message}</p> : null}
    </form>
  );
}
