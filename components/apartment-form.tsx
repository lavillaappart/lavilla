'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

const initialForm = { name: '', shortDescription: '', description: '', city: '', address: '', capacity: '2', bedrooms: '1', beds: '1', bathrooms: '1', surface: '', price: '', minStay: '2', maxStay: '', checkIn: '15:00', checkOut: '11:00' };
const fileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

export default function ApartmentForm() {
  const [form, setForm] = useState(initialForm);
  const [cover, setCover] = useState<File | null>(null);
  const [gallery, setGallery] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const update = (field: keyof typeof initialForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const addGallery = (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    setGallery((current) => {
      const keys = new Set(current.map(fileKey));
      return [...current, ...selected.filter((file) => !keys.has(fileKey(file)))].slice(0, 9);
    });
  };

  const uploadImage = async (supabase: ReturnType<typeof createClient>, apartmentId: string, file: File, primary: boolean, order: number) => {
    const path = `${apartmentId}/${Date.now()}-${order}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    const upload = await supabase.storage.from('apartment-images').upload(path, file, { contentType: file.type });
    if (upload.error) throw new Error(upload.error.message === 'Bucket not found' ? 'Bucket photo manquant : exécutez la migration 004 dans Supabase.' : upload.error.message);
    const publicUrl = supabase.storage.from('apartment-images').getPublicUrl(path).data.publicUrl;
    const record = await supabase.from('apartment_images').insert({ apartment_id: apartmentId, storage_path: publicUrl, is_primary: primary, sort_order: order, alt_text: form.name });
    if (record.error) { await supabase.storage.from('apartment-images').remove([path]); throw new Error(record.error.message); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!cover) { setMessage('Ajoutez une photo de profil avant de créer l’appartement.'); return; }
    if (gallery.length > 9) { setMessage('Un appartement peut contenir au maximum 10 photos.'); return; }
    setLoading(true); setMessage('');
    const supabase = createClient();
    const slug = form.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data: userData } = await supabase.auth.getUser();
    const { data: apartment, error } = await supabase.from('apartments').insert({ slug, status: 'active', city: form.city, address: form.address, capacity: Number(form.capacity), bedrooms: Number(form.bedrooms), beds: Number(form.beds), bathrooms: Number(form.bathrooms), surface_m2: Number(form.surface || 0), base_price: Number(form.price), min_stay_nights: Number(form.minStay), max_stay_nights: form.maxStay ? Number(form.maxStay) : null, currency: 'MAD', check_in_time: form.checkIn, check_out_time: form.checkOut, created_by: userData.user?.id }).select('id').single();
    if (error || !apartment) { setMessage(error?.message ?? 'Impossible de créer l’appartement.'); setLoading(false); return; }
    const translation = await supabase.from('apartment_translations').insert({ apartment_id: apartment.id, locale: 'fr', name: form.name, short_description: form.shortDescription, description: form.description, location_text: form.city });
    if (translation.error) { setMessage(translation.error.message); setLoading(false); return; }
    try {
      await uploadImage(supabase, apartment.id, cover, true, 0);
      for (let index = 0; index < gallery.length; index += 1) await uploadImage(supabase, apartment.id, gallery[index], false, index + 1);
      setForm(initialForm); setCover(null); setGallery([]); setMessage('Appartement créé avec succès.');
    } catch (uploadError) { setMessage(uploadError instanceof Error ? uploadError.message : 'Impossible d’envoyer les photos.'); }
    setLoading(false);
  };

  return <form className="apartment-form" onSubmit={submit}>
    <section className="form-section"><div className="form-section-heading"><span>01</span><div><h2>Informations principales</h2><p>Le nom et le contenu visible par les voyageurs.</p></div></div><div className="form-grid two"><label>Nom de l’appartement<input value={form.name} onChange={(event) => update('name', event.target.value)} required /></label><label>Ville<input value={form.city} onChange={(event) => update('city', event.target.value)} required /></label><label className="full">Adresse<input value={form.address} onChange={(event) => update('address', event.target.value)} required /></label><label className="full">Description courte<input value={form.shortDescription} onChange={(event) => update('shortDescription', event.target.value)} required /></label><label className="full">Description complète<textarea rows={5} value={form.description} onChange={(event) => update('description', event.target.value)} required /></label></div></section>
    <section className="form-section"><div className="form-section-heading"><span>02</span><div><h2>Capacité et prix</h2><p>Les données utilisées pour la recherche.</p></div></div><div className="form-grid four"><label>Voyageurs<input type="number" min="1" value={form.capacity} onChange={(event) => update('capacity', event.target.value)} required /></label><label>Chambres<input type="number" min="0" value={form.bedrooms} onChange={(event) => update('bedrooms', event.target.value)} required /></label><label>Lits<input type="number" min="0" value={form.beds} onChange={(event) => update('beds', event.target.value)} required /></label><label>Salles de bain<input type="number" min="0" value={form.bathrooms} onChange={(event) => update('bathrooms', event.target.value)} required /></label><label>Surface m²<input type="number" min="0" value={form.surface} onChange={(event) => update('surface', event.target.value)} /></label><label>Prix / nuit (€)<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => update('price', event.target.value)} required /></label><label>Séjour minimum<input type="number" min="1" value={form.minStay} onChange={(event) => update('minStay', event.target.value)} required /></label><label>Séjour maximum<input type="number" min="1" value={form.maxStay} onChange={(event) => update('maxStay', event.target.value)} /></label></div></section>
    <section className="form-section"><div className="form-section-heading"><span>03</span><div><h2>Photos de l’appartement</h2><p>Une photo de profil et jusqu’à 9 photos supplémentaires.</p></div></div><div className="photo-upload-layout"><label className="photo-dropzone profile-photo"><span className="photo-zone-title">Photo de profil</span><span className="photo-zone-help">Image principale affichée en premier</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCover(event.target.files?.[0] ?? null)} /><strong>{cover ? cover.name : 'Choisir une photo'}</strong></label><label className="photo-dropzone gallery-photos"><span className="photo-zone-title">Galerie</span><span className="photo-zone-help">Maximum 9 photos supplémentaires</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => addGallery(event.target.files)} /><strong>{gallery.length ? `${gallery.length}/9 photo(s) ajoutée(s)` : 'Ajouter plusieurs photos'}</strong></label></div></section>
    <div className="form-actions"><button className="auth-submit" disabled={loading} type="submit">{loading ? 'Création en cours...' : 'Créer l’appartement'}</button>{message ? <p className="auth-message" role="status">{message}</p> : null}</div>
  </form>;
}
