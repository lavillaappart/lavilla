import Link from 'next/link';
import { createServerComponentClient } from '@/lib/supabase-server';
import SessionControls from '@/components/session-controls';
import Brand from '@/components/brand';

export default async function HomePage() {
  const supabase = createServerComponentClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const { data: featuredApartments } = await supabase
    .from('apartments')
    .select('id, slug, city, capacity, bedrooms, base_price, currency, apartment_translations(locale, name, short_description), apartment_images(storage_path, is_primary, sort_order)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3);
  const { data: profile } = sessionData.session
    ? await supabase.from('profiles').select('role_id').eq('id', sessionData.session.user.id).maybeSingle()
    : { data: null };
  const { data: roleData } = profile?.role_id
    ? await supabase.from('roles').select('slug').eq('id', profile.role_id).maybeSingle()
    : { data: null };
  const isAdmin = ['owner', 'admin', 'coadmin', 'staff'].includes(roleData?.slug ?? '');

  return (
    <main className="site-main">
      <header className="main-header">
        <div className="shell main-header-inner">
          <nav className="nav">
            <Brand />
            <div className="nav-links"><Link href="/appartements">Nos appartements</Link><Link href="#histoire">Notre histoire</Link></div>
            <div className="account-bar"><SessionControls isAuthenticated={Boolean(sessionData.session)} isAdmin={isAdmin} /></div>
          </nav>
        </div>
      </header>
      <section className="hero">
        <div className="hero-image" />
        <div className="shell hero-content-wrap">
          <div className="hero-content"><p className="eyebrow">Séjours avec une âme</p><h1>Un lieu à vous, le temps d&apos;un séjour.</h1><p className="hero-copy">Des appartements lumineux, choisis pour leur caractère et leur douceur de vivre au bord de la Méditerranée.</p></div>
          <form className="search-panel" action="/appartements"><div className="search-field"><label htmlFor="check-in">Arrivée</label><input id="check-in" name="check_in" type="date" required /></div><div className="search-field"><label htmlFor="check-out">Départ</label><input id="check-out" name="check_out" type="date" required /></div><div className="search-field"><label htmlFor="guests">Voyageurs</label><input id="guests" name="guests" type="number" min="1" max="12" defaultValue="2" required /></div><button className="search-button" type="submit">Rechercher</button></form>
        </div>
      </section>
      <section className="section shell"><div className="section-heading"><div><p className="eyebrow">La sélection du moment</p><h2>Des adresses qui restent.</h2></div><p>Chaque appartement est pensé comme une maison : simple, vivant et prêt à accueillir votre histoire.</p></div><div className="feature-grid">{(featuredApartments ?? []).map((apartment) => { const translations = Array.isArray(apartment.apartment_translations) ? apartment.apartment_translations : []; const translation = translations.find((item) => item.locale === 'fr') ?? translations[0] ?? null; const image = [...(apartment.apartment_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0]; return <article className="feature-card" key={apartment.id}><div className="card-image">{image?.storage_path ? <img src={image.storage_path} alt={translation?.name ?? apartment.slug} /> : null}</div><div className="card-body"><h3>{translation?.name ?? apartment.slug}</h3><p className="card-meta">{apartment.city} · {apartment.capacity} voyageurs · {apartment.bedrooms} chambres</p><div className="card-footer"><span className="price">à partir de {apartment.base_price} {apartment.currency ?? 'MAD'}</span><Link aria-label={`Voir ${translation?.name ?? apartment.slug}`} className="arrow-link" href={`/appartements/${apartment.slug}`}>↗</Link></div></div></article>; })}</div></section>
      <section className="story-band" id="histoire"><div className="section shell story-grid"><div><p className="eyebrow">L&apos;esprit La Villa</p><h2>Moins comme un hôtel. Plus comme chez vous.</h2><p>Nous croyons aux endroits qui donnent envie de ralentir. Des clés simples, des quartiers vivants, et le confort nécessaire pour vraiment profiter.</p><Link className="story-link" href="/appartements">Découvrir les adresses <span>↗</span></Link></div><div className="story-stat"><strong>24h</strong><span>pour vous répondre après votre demande de séjour</span></div></div></section>
      <footer className="footer"><div className="shell footer-inner"><span>© 2026 La Villa Appart</span><span>Al Hoceima</span><div className="footer-links">{!isAdmin ? <Link href="/compte">Espace client</Link> : null}</div></div></footer>
    </main>
  );
}
