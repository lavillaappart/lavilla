import Link from 'next/link';

const featuredApartments = [
  { name: 'La Suite Jardin', city: 'Valencia', meta: '2 voyageurs · 1 chambre', price: 'à partir de 120 €', image: 'one' },
  { name: 'Lumière Méditerranée', city: 'Valencia', meta: '4 voyageurs · 2 chambres', price: 'à partir de 160 €', image: 'two' },
  { name: 'La Maison Patio', city: 'Valencia', meta: '6 voyageurs · 3 chambres', price: 'à partir de 220 €', image: 'three' }
];

export default function HomePage() {
  return (
    <main className="site-main">
      <section className="hero"><div className="shell"><nav className="nav"><Link className="brand" href="/"><span className="brand-mark" /> La Villa</Link><div className="nav-links"><Link href="/appartements">Nos appartements</Link><Link href="#histoire">Notre histoire</Link><Link className="nav-cta" href="/appartements">Réserver un séjour</Link></div></nav><div className="hero-image" /><div className="hero-content"><p className="eyebrow">Séjours avec une âme</p><h1>Un lieu à vous, le temps d&apos;un séjour.</h1><p className="hero-copy">Des appartements lumineux, choisis pour leur caractère et leur douceur de vivre au bord de la Méditerranée.</p></div><form className="search-panel" action="/appartements"><div className="search-field"><label htmlFor="check-in">Arrivée</label><input id="check-in" name="check_in" type="date" required /></div><div className="search-field"><label htmlFor="check-out">Départ</label><input id="check-out" name="check_out" type="date" required /></div><div className="search-field"><label htmlFor="guests">Voyageurs</label><input id="guests" name="guests" type="number" min="1" max="12" defaultValue="2" required /></div><button className="search-button" type="submit">Rechercher</button></form></div></section>
      <section className="section shell"><div className="section-heading"><div><p className="eyebrow">La sélection du moment</p><h2>Des adresses qui restent.</h2></div><p>Chaque appartement est pensé comme une maison : simple, vivant et prêt à accueillir votre histoire.</p></div><div className="feature-grid">{featuredApartments.map((apartment) => <article className="feature-card" key={apartment.name}><div className={`card-image ${apartment.image}`} /><div className="card-body"><h3>{apartment.name}</h3><p className="card-meta">{apartment.city} · {apartment.meta}</p><div className="card-footer"><span className="price">{apartment.price}</span><Link aria-label={`Voir ${apartment.name}`} className="arrow-link" href="/appartements">↗</Link></div></div></article>)}</div></section>
      <section className="story-band" id="histoire"><div className="section shell story-grid"><div><p className="eyebrow">L&apos;esprit La Villa</p><h2>Moins comme un hôtel. Plus comme chez vous.</h2><p>Nous croyons aux endroits qui donnent envie de ralentir. Des clés simples, des quartiers vivants, et le confort nécessaire pour vraiment profiter.</p></div><div className="story-stat"><strong>24h</strong><span>pour vous répondre après votre demande de séjour</span></div></div></section>
      <footer className="footer"><div className="shell footer-inner"><span>© 2026 La Villa</span><span>Valencia · Méditerranée</span><Link href="/appartements">Explorer les appartements ↗</Link></div></footer>
    </main>
  );
}
