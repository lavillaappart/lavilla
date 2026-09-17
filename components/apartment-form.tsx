'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

const initialForm = { name: '', shortDescription: '', description: '', city: '', address: '', capacity: '2', bedrooms: '1', beds: '1', bathrooms: '1', surface: '', price: '', minStay: '2', maxStay: '', checkIn: '15:00', checkOut: '11:00' };

export default function ApartmentForm() {
  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const update = (field: keyof typeof initialForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const supabase = createClient();
    const slug = form.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const { data: userData } = await supabase.auth.getUser();
    const { data: apartment, error } = await supabase.from('apartments').insert({
      slug,
      status: 'active',
      city: form.city,
      address: form.address,
      capacity: Number(form.capacity),
      bedrooms: Number(form.bedrooms),
      beds: Number(form.beds),
      bathrooms: Number(form.bathrooms),
      surface_m2: Number(form.surface || 0),
      base_price: Number(form.price),
      min_stay_nights: Number(form.minStay),
      max_stay_nights: form.maxStay ? Number(form.maxStay) : null,
      currency: 'EUR',
      check_in_time: form.checkIn,
      check_out_time: form.checkOut,
      created_by: userData.user?.id
    }).select('id').single();

    if (error || !apartment) {
      setMessage(error?.message ?? 'Impossible de créer l’appartement.');
      setLoading(false);
      return;
    }

    const { error: translationError } = await supabase.from('apartment_translations').insert({
      apartment_id: apartment.id,
      locale: 'fr',
      name: form.name,
      short_description: form.shortDescription,
      description: form.description,
      location_text: form.city
    });

    if (translationError) {
      setMessage(translationError.message);
      setLoading(false);
      return;
    }

    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      const path = `${apartment.id}/${Date.now()}-${index}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
      const { error: uploadError } = await supabase.storage.from('apartment-images').upload(path, image, { upsert: false, contentType: image.type });
      if (uploadError) {
        setMessage(`Appartement créé, mais une photo n’a pas pu être envoyée : ${uploadError.message}`);
        setLoading(false);
        return;
      }
      const { data: publicUrl } = supabase.storage.from('apartment-images').getPublicUrl(path);
      const { error: imageError } = await supabase.from('apartment_images').insert({ apartment_id: apartment.id, storage_path: publicUrl.publicUrl, is_primary: index === 0, sort_order: index, alt_text: form.name });
      if (imageError) {
        setMessage(imageError.message);
        setLoading(false);
        return;
      }
    }

    setForm(initialForm);
    setImages([]);
    setMessage('Appartement créé avec succès.');
    setLoading(false);
  };

  return (
    <form className="apartment-form" onSubmit={handleSubmit}>
      <section className="form-section"><div className="form-section-heading"><span>01</span><div><h2>Informations principales</h2><p>Le nom et le contenu visible par les voyageurs.</p></div></div><div className="form-grid two"><label>Nom de l’appartement<input value={form.name} onChange={(event) => update('name', event.target.value)} required /></label><label>Ville<input value={form.city} onChange={(event) => update('city', event.target.value)} required /></label><label className="full">Adresse<input value={form.address} onChange={(event) => update('address', event.target.value)} required /></label><label className="full">Description courte<input value={form.shortDescription} onChange={(event) => update('shortDescription', event.target.value)} required /></label><label className="full">Description complète<textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows={5} required /></label></div></section>
      <section className="form-section"><div className="form-section-heading"><span>02</span><div><h2>Capacité et prix</h2><p>Ces données servent à filtrer les disponibilités.</p></div></div><div className="form-grid four"><label>Voyageurs<input type="number" min="1" value={form.capacity} onChange={(event) => update('capacity', event.target.value)} required /></label><label>Chambres<input type="number" min="0" value={form.bedrooms} onChange={(event) => update('bedrooms', event.target.value)} required /></label><label>Lits<input type="number" min="0" value={form.beds} onChange={(event) => update('beds', event.target.value)} required /></label><label>Salles de bain<input type="number" min="0" value={form.bathrooms} onChange={(event) => update('bathrooms', event.target.value)} required /></label><label>Surface m²<input type="number" min="0" value={form.surface} onChange={(event) => update('surface', event.target.value)} /></label><label>Prix / nuit (€)<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => update('price', event.target.value)} required /></label><label>Séjour minimum<input type="number" min="1" value={form.minStay} onChange={(event) => update('minStay', event.target.value)} required /></label><label>Séjour maximum<input type="number" min="1" value={form.maxStay} onChange={(event) => update('maxStay', event.target.value)} /></label></div></section>
      <section className="form-section"><div className="form-section-heading"><span>03</span><div><h2>Horaires et photos</h2><p>Ajoutez les images depuis votre ordinateur. La première sera la couverture.</p></div></div><div className="form-grid two"><label>Heure d’arrivée<input type="time" value={form.checkIn} onChange={(event) => update('checkIn', event.target.value)} required /></label><label>Heure de départ<input type="time" value={form.checkOut} onChange={(event) => update('checkOut', event.target.value)} required /></label><label className="upload-zone full">Photos de l’appartement<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setImages(Array.from(event.target.files ?? []))} /><small>{images.length ? `${images.length} photo(s) sélectionnée(s)` : 'JPG, PNG ou WebP · plusieurs fichiers possibles'}</small></label></div></section>
      <div className="form-actions"><button className="auth-submit" disabled={loading} type="submit">{loading ? 'Création en cours...' : 'Créer l’appartement'}</button>{message ? <p className="auth-message" role="status">{message}</p> : null}</div>
    </form>
  );
}
