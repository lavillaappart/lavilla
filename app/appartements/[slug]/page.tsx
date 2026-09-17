import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerComponentClient } from '@/lib/supabase-server';

type Translation = {
  locale: 'es' | 'fr' | 'en';
  name: string;
  short_description: string | null;
  description: string | null;
  location_text: string | null;
};

type ApartmentImage = { storage_path: string; is_primary: boolean; sort_order: number; alt_text: string | null };

function getTranslation(translations: Translation[]) {
  return (
    translations.find((translation) => translation.locale === 'fr') ??
    translations.find((translation) => translation.locale === 'es') ??
    translations.find((translation) => translation.locale === 'en')
  );
}

export default async function AppartementPage({ params }: { params: { slug: string } }) {
  const supabase = createServerComponentClient();
  const { data, error } = await supabase
    .from('apartments')
    .select(
      'id, slug, city, address, capacity, bedrooms, beds, bathrooms, surface_m2, base_price, currency, check_in_time, check_out_time, apartment_translations(locale, name, short_description, description, location_text), apartment_images(storage_path, is_primary, sort_order, alt_text)'
    )
    .eq('slug', params.slug)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const apartment = data as typeof data & { apartment_translations: Translation[]; apartment_images: ApartmentImage[] };
  const translation = getTranslation(apartment.apartment_translations);
  const images = [...(apartment.apartment_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);

  return (
    <main className="apartment-public-page">
      <div className="shell public-detail-shell"><Link className="text-link" href="/appartements">← Retour aux appartements</Link>
      <article className="apartment-public-detail">
        <div className="public-gallery">{images.length ? images.map((image) => <img key={image.storage_path} src={image.storage_path} alt={image.alt_text ?? translation?.name ?? apartment.slug} />) : <div className="public-image-placeholder">Photos bientôt disponibles</div>}</div>
        <div className="public-detail-copy">
        <p>{apartment.city}</p>
        <h1>{translation?.name ?? apartment.slug}</h1>
        <p>{translation?.description ?? translation?.short_description}</p>
        <p>{translation?.location_text ?? apartment.address}</p>
        <dl>
          <div>
            <dt>Voyageurs</dt>
            <dd>{apartment.capacity}</dd>
          </div>
          <div>
            <dt>Chambres</dt>
            <dd>{apartment.bedrooms}</dd>
          </div>
          <div>
            <dt>Lits</dt>
            <dd>{apartment.beds}</dd>
          </div>
          <div>
            <dt>Salles de bain</dt>
            <dd>{apartment.bathrooms}</dd>
          </div>
        </dl>
        <p>
          {apartment.base_price} MAD / nuit
        </p>
        <p>
          Arrivée à partir de {apartment.check_in_time ?? '15:00'} · Départ avant {apartment.check_out_time ?? '11:00'}
        </p>
        </div>
      </article></div>
    </main>
  );
}