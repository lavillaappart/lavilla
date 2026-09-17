import Link from 'next/link';
import { createServerComponentClient } from '@/lib/supabase-server';

type Apartment = {
  id: string;
  slug: string;
  city: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  base_price: number;
  apartment_translations: Array<{
    locale: 'es' | 'fr' | 'en';
    name: string;
    short_description: string | null;
  }>;
};

function getTranslation(apartment: Apartment) {
  return (
    apartment.apartment_translations.find((translation) => translation.locale === 'fr') ??
    apartment.apartment_translations.find((translation) => translation.locale === 'es') ??
    apartment.apartment_translations.find((translation) => translation.locale === 'en')
  );
}

export default async function AppartementsPage() {
  const supabase = createServerComponentClient();
  const { data, error } = await supabase
    .from('apartments')
    .select(
      'id, slug, city, capacity, bedrooms, bathrooms, base_price, apartment_translations(locale, name, short_description)'
    )
    .eq('status', 'active')
    .order('is_featured', { ascending: false });

  if (error) {
    throw new Error('Impossible de charger les appartements.');
  }

  const apartments = (data ?? []) as Apartment[];

  return (
    <main>
      <header>
        <p>La Villa</p>
        <h1>Nos appartements</h1>
        <p>Découvrez des logements confortables pour votre prochain séjour.</p>
      </header>

      {apartments.length === 0 ? (
        <p>Aucun appartement disponible pour le moment.</p>
      ) : (
        <section aria-label="Liste des appartements">
          {apartments.map((apartment) => {
            const translation = getTranslation(apartment);

            return (
              <article key={apartment.id}>
                <h2>{translation?.name ?? apartment.slug}</h2>
                <p>{translation?.short_description}</p>
                <p>
                  {apartment.city} · {apartment.capacity} voyageurs · {apartment.bedrooms} chambres ·{' '}
                  {apartment.bathrooms} salles de bain
                </p>
                <p>{apartment.base_price} EUR / nuit</p>
                <Link href={`/appartements/${apartment.slug}`}>Voir l'appartement</Link>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}