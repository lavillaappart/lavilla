'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function RegisterForm() {
  const [form, setForm] = useState({ fullName: '', address: '', country: '', phone: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: form.fullName,
          address: form.address,
          country: form.country,
          whatsapp_phone: form.phone,
          language: 'fr'
        }
      }
    });

    setLoading(false);
    setMessage(error ? error.message : 'Vérifiez votre adresse email pour activer votre compte.');
  };

  const signUpWithGoogle = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });

    if (error) setMessage(error.message);
  };

  return (
    <div className="auth-stack">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-grid">
          <label>Nom complet<input value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} required autoComplete="name" /></label>
          <label>Pays<input value={form.country} onChange={(event) => updateField('country', event.target.value)} required autoComplete="country-name" /></label>
        </div>
        <label>Adresse complète<input value={form.address} onChange={(event) => updateField('address', event.target.value)} required autoComplete="street-address" /></label>
        <label>Téléphone WhatsApp<input type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} required autoComplete="tel" placeholder="+33 6 00 00 00 00" /></label>
        <label>Email<input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required autoComplete="email" /></label>
        <label>Mot de passe<input type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} required minLength={8} autoComplete="new-password" /></label>
        <button className="auth-submit" disabled={loading} type="submit">{loading ? 'Création...' : 'Créer mon compte'}</button>
      </form>
      <div className="auth-divider"><span>ou</span></div>
      <button className="auth-google" onClick={signUpWithGoogle} type="button">Continuer avec Google</button>
      {message ? <p className="auth-message" role="status">{message}</p> : null}
    </div>
  );
}
