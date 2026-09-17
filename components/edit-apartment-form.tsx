'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

type Image = { id: string; storage_path: string; is_primary: boolean; sort_order: number };
type ApartmentData = { id: string; city: string; address: string; capacity: number; bedrooms: number; beds: number; bathrooms: number; surface_m2: number; base_price: number; min_stay_nights: number; max_stay_nights: number | null; check_in_time: string | null; check_out_time: string | null; translation: { name: string; short_description: string | null; description: string | null } | null; images: Image[] };
const key = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

export default function EditApartmentForm({ apartment }: { apartment: ApartmentData }) {
  const [form, setForm] = useState({ name: apartment.translation?.name ?? '', shortDescription: apartment.translation?.short_description ?? '', description: apartment.translation?.description ?? '', city: apartment.city, address: apartment.address, capacity: String(apartment.capacity), bedrooms: String(apartment.bedrooms), beds: String(apartment.beds), bathrooms: String(apartment.bathrooms), surface: String(apartment.surface_m2 ?? ''), price: String(apartment.base_price), minStay: String(apartment.min_stay_nights), maxStay: apartment.max_stay_nights ? String(apartment.max_stay_nights) : '', checkIn: apartment.check_in_time ?? '15:00', checkOut: apartment.check_out_time ?? '11:00' });
  const [coverId, setCoverId] = useState(apartment.images.find((image) => image.is_primary)?.id ?? '');
  const [newCover, setNewCover] = useState<File | null>(null);
  const [gallery, setGallery] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const addGallery = (files: FileList | null) => setGallery((current) => [...current, ...Array.from(files ?? [])].filter((file, index, all) => all.findIndex((item) => key(item) === key(file)) === index).slice(0, Math.max(0, 10 - apartment.images.length - (newCover ? 1 : 0))));

  const upload = async (supabase: ReturnType<typeof createClient>, file: File, primary: boolean, order: number) => {
    const path = `${apartment.id}/${Date.now()}-${order}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    const result = await supabase.storage.from('apartment-images').upload(path, file, { contentType: file.type });
    if (result.error) throw new Error(result.error.message);
    const url = supabase.storage.from('apartment-images').getPublicUrl(path).data.publicUrl;
    const row = await supabase.from('apartment_images').insert({ apartment_id: apartment.id, storage_path: url, is_primary: primary, sort_order: order, alt_text: form.name });
    if (row.error) { await supabase.storage.from('apartment-images').remove([path]); throw new Error(row.error.message); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setMessage('');
    const supabase = createClient();
    const slug = form.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const updateResult = await supabase.from('apartments').update({ slug, city: form.city, address: form.address, capacity: Number(form.capacity), bedrooms: Number(form.bedrooms), beds: Number(form.beds), bathrooms: Number(form.bathrooms), surface_m2: Number(form.surface || 0), base_price: Number(form.price), min_stay_nights: Number(form.minStay), max_stay_nights: form.maxStay ? Number(form.maxStay) : null, check_in_time: form.checkIn, check_out_time: form.checkOut }).eq('id', apartment.id);
    if (updateResult.error) { setMessage(updateResult.error.message); setLoading(false); return; }
    const translation = await supabase.from('apartment_translations').upsert({ apartment_id: apartment.id, locale: 'fr', name: form.name, short_description: form.shortDescription, description: form.description, location_text: form.city }, { onConflict: 'apartment_id,locale' });
    if (translation.error) { setMessage(translation.error.message); setLoading(false); return; }
    try {
      if (newCover) { await supabase.from('apartment_images').update({ is_primary: false }).eq('apartment_id', apartment.id); await upload(supabase, newCover, true, 0); }
      else if (coverId) { const reset = await supabase.from('apartment_images').update({ is_primary: false }).eq('apartment_id', apartment.id); if (reset.error) throw new Error(reset.error.message); const setCover = await supabase.from('apartment_images').update({ is_primary: true }).eq('id', coverId); if (setCover.error) throw new Error(setCover.error.message); }
      const existingCount = apartment.images.length + (newCover ? 1 : 0);
      if (existingCount + gallery.length > 10) throw new Error('Un appartement peut contenir au maximum 10 photos.');
      for (let index = 0; index < gallery.length; index += 1) await upload(supabase, gallery[index], false, existingCount + index);
      setMessage('Appartement modifié avec succès.'); setLoading(false); window.setTimeout(() => window.location.reload(), 700);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Impossible de modifier les photos.'); setLoading(false); }
  };

  return <form className="apartment-form" onSubmit={submit}><section className="form-section"><div className="form-section-heading"><span>01</span><div><h2>Informations principales</h2><p>Modifiez les données visibles par les voyageurs.</p></div></div><div className="form-grid two"><label>Nom<input value={form.name} onChange={(event) => update('name', event.target.value)} required /></label><label>Ville<input value={form.city} onChange={(event) => update('city', event.target.value)} required /></label><label className="full">Adresse<input value={form.address} onChange={(event) => update('address', event.target.value)} required /></label><label className="full">Description courte<input value={form.shortDescription} onChange={(event) => update('shortDescription', event.target.value)} required /></label><label className="full">Description complète<textarea rows={5} value={form.description} onChange={(event) => update('description', event.target.value)} required /></label></div></section><section className="form-section"><div className="form-section-heading"><span>02</span><div><h2>Capacité et prix</h2><p>Actualisez les conditions du séjour.</p></div></div><div className="form-grid four"><label>Voyageurs<input type="number" min="1" value={form.capacity} onChange={(event) => update('capacity', event.target.value)} required /></label><label>Chambres<input type="number" min="0" value={form.bedrooms} onChange={(event) => update('bedrooms', event.target.value)} required /></label><label>Lits<input type="number" min="0" value={form.beds} onChange={(event) => update('beds', event.target.value)} required /></label><label>Salles de bain<input type="number" min="0" value={form.bathrooms} onChange={(event) => update('bathrooms', event.target.value)} required /></label><label>Surface m²<input type="number" min="0" value={form.surface} onChange={(event) => update('surface', event.target.value)} /></label><label>Prix / nuit (€)<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => update('price', event.target.value)} required /></label><label>Séjour minimum<input type="number" min="1" value={form.minStay} onChange={(event) => update('minStay', event.target.value)} required /></label><label>Séjour maximum<input type="number" min="1" value={form.maxStay} onChange={(event) => update('maxStay', event.target.value)} /></label></div></section><section className="form-section"><div className="form-section-heading"><span>03</span><div><h2>Photos de l’appartement</h2><p>Une photo de profil et jusqu’à 10 photos au total.</p></div></div><div className="image-preview-grid">{apartment.images.map((image) => <label className={`image-preview ${coverId === image.id ? 'selected' : ''}`} key={image.id}><img src={image.storage_path} alt={form.name} /><span><input type="radio" name="current-cover" checked={coverId === image.id && !newCover} onChange={() => { setCoverId(image.id); setNewCover(null); }} /> {coverId === image.id && !newCover ? 'Photo de profil' : 'Galerie'}</span></label>)}</div><div className="photo-upload-layout"><label className="photo-dropzone profile-photo"><span className="photo-zone-title">Nouvelle photo de profil</span><span className="photo-zone-help">Remplace la photo principale</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setNewCover(event.target.files?.[0] ?? null)} /><strong>{newCover ? newCover.name : 'Choisir une photo'}</strong></label><label className="photo-dropzone gallery-photos"><span className="photo-zone-title">Ajouter à la galerie</span><span className="photo-zone-help">Maximum 10 photos au total</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => addGallery(event.target.files)} /><strong>{gallery.length ? `${gallery.length} nouvelle(s) photo(s)` : 'Ajouter plusieurs photos'}</strong></label></div></section><div className="form-actions"><button className="auth-submit" disabled={loading} type="submit">{loading ? 'Enregistrement...' : 'Enregistrer les modifications'}</button>{message ? <p className="auth-message" role="status">{message}</p> : null}</div></form>;
}
