'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

type ProfileValues = { fullName: string; address: string; country: string; phone: string };

export default function ProfileCompletionForm({ initialValues }: { initialValues: ProfileValues }) {
  const [form, setForm] = useState(initialValues);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('profiles').update({
      full_name: form.fullName,
      address: form.address,
      country: form.country,
      phone: form.phone,
      whatsapp_phone: form.phone,
      language: 'fr'
    }).eq('id', userData.user?.id ?? '');
    setLoading(false);
    setMessage(error ? error.message : 'Profil complété. Vous pouvez maintenant demander une réservation.');
  };

  const update = (field: keyof ProfileValues, value: string) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-grid">
        <label>Nom complet<input value={form.fullName} onChange={(event) => update('fullName', event.target.value)} required autoComplete="name" /></label>
        <label>Pays<input value={form.country} onChange={(event) => update('country', event.target.value)} required autoComplete="country-name" /></label>
      </div>
      <label>Adresse complète<input value={form.address} onChange={(event) => update('address', event.target.value)} required autoComplete="street-address" /></label>
      <label>Téléphone WhatsApp<input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} required autoComplete="tel" /></label>
      <button className="auth-submit" disabled={loading} type="submit">{loading ? 'Enregistrement...' : 'Enregistrer mes informations'}</button>
      {message ? <p className="auth-message" role="status">{message}</p> : null}
    </form>
  );
}
