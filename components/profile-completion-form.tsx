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

    const userId = userData.user?.id ?? '';
    const nameParts = form.fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts.shift() ?? '';
    const lastName = nameParts.join(' ') ?? '';

    let profileError = null as { message: string } | null;

    if (userId) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        const { error } = await supabase.from('profiles').update({
          full_name: form.fullName,
          address: form.address,
          country: form.country,
          phone: form.phone,
          whatsapp_phone: form.phone,
          language: 'fr'
        }).eq('id', userId);
        profileError = error ? { message: error.message } : null;
      } else {
        const { error } = await supabase.from('profiles').insert({
          id: userId,
          email: userData.user?.email ?? '',
          full_name: form.fullName,
          address: form.address,
          country: form.country,
          phone: form.phone,
          whatsapp_phone: form.phone,
          language: 'fr',
          status: 'active'
        });
        profileError = error ? { message: error.message } : null;
      }
    }

    if (userId) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('email', userData.user?.email ?? '')
        .maybeSingle();

      if (customerData?.id) {
        await supabase.from('customers').update({
          first_name: firstName,
          last_name: lastName,
          phone: form.phone,
          country: form.country,
          preferred_language: 'fr'
        }).eq('id', customerData.id);
      } else if (userData.user?.email) {
        await supabase.from('customers').insert({
          first_name: firstName || 'Client',
          last_name: lastName || 'Client',
          email: userData.user.email,
          phone: form.phone,
          country: form.country,
          preferred_language: 'fr',
          source: 'website'
        });
      }
    }

    setLoading(false);
    setMessage(profileError ? profileError.message : 'Profil complété. Vous pouvez maintenant demander une réservation.');
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
