import Link from 'next/link';
import { createServerComponentClient } from '@/lib/supabase-server';
import Brand from '@/components/brand';

type Apartment = {
  id: string;
  slug: string;
  city: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  base_price: number;
  currency: string;
  apartment_images: Array<{ storage_path: string; is_primary: boolean; sort_order: number }>;
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
      'id, slug, city, capacity, bedrooms, bathrooms, base_price, currency, apartment_translations(locale, name, short_description), apartment_images(storage_path, is_primary, sort_order)'
    )
    .eq('status', 'active')
    .order('is_featured', { ascending: false });

  if (error) {
    throw new Error('Impossible de charger les appartements.');
  }

  const apartments = (data ?? []).map((apartment) => {
    const typedApartment = apartment as Apartment;
    return {
      ...typedApartment,
      apartment_translations: Array.isArray(typedApartment.apartment_translations) ? typedApartment.apartment_translations : [],
      apartment_images: [...(typedApartment.apartment_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
    };
  });

  return (
    <main className="site-main">
      <header className="main-header">
        <div className="shell main-header-inner">
          <nav className="nav">
            <Brand />
            <div className="nav-links">
              <Link className="nav-cta" href="/">Retour à l&apos;accueil</Link>
            </div>
          </nav>
        </div>
      </header>

      <section className="listing-intro shell">
        <p className="eyebrow">Nos adresses</p>
        <h1>Choisissez votre prochain chez-vous.</h1>
        <p>Des espaces singuliers pour vivre Al Hoceima à votre rythme.</p>
      </section>

      {apartments.length === 0 ? <section className="shell listing-grid"><p className="empty-state">Aucun appartement disponible pour le moment.</p></section> : (
        <section className="shell listing-grid" aria-label="Liste des appartements">
          {apartments.map((apartment) => {
            const translation = getTranslation(apartment);

            return (
              <article className="feature-card" key={apartment.id}>
                <div className="card-image">{apartment.apartment_images[0]?.storage_path ? <img src={apartment.apartment_images[0].storage_path} alt={translation?.name ?? apartment.slug} /> : null}</div>
                <div className="card-body"><h2>{translation?.name ?? apartment.slug}</h2><p className="card-meta">{apartment.city} · {apartment.capacity} voyageurs · {apartment.bedrooms} chambres</p><p className="card-meta">{translation?.short_description}</p><div className="card-footer"><span className="price">{apartment.base_price} MAD / nuit</span><Link aria-label={`Voir ${translation?.name ?? apartment.slug}`} className="arrow-link" href={`/appartements/${apartment.slug}`}>↗</Link></div></div>
              </article>
            );
          })}
        </section>
      )}
      <footer className="footer"><div className="shell footer-inner"><span>© 2026 La Villa Appart</span><Link href="/">Accueil ↗</Link></div></footer>
    </main>
  );
}